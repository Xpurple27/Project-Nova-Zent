"""Audit a PRIVATE export. Restricted rational/TeX grammar; never eval/execute content.

Key/option checking is separate from independently deriving the displayed answer.
Unparsed word problems require editorial review.
"""
import ast
import json
import re
import sys
from collections import Counter
from fractions import Fraction


def group(source, start):
    if start >= len(source) or source[start] != '{':
        raise ValueError('missing TeX group')
    depth = 1
    for end in range(start + 1, len(source)):
        depth += (source[end] == '{') - (source[end] == '}')
        if depth == 0:
            return source[start + 1:end], end + 1
    raise ValueError('unclosed TeX group')


def arithmetic(source):
    source = str(source).strip().strip('$').replace('−', '-').replace(',', '.')
    if len(source) > 1600:
        raise ValueError('expression too long')
    for command in [r'\left', r'\right', r'\,', r'\!']:
        source = source.replace(command, '')
    source = source.replace(r'\times', '*').replace(r'\cdot', '*').replace(r'\div', '/')
    source = source.replace('×', '*').replace('÷', '/').replace(r'\square', 'x')
    while r'\frac' in source:
        at = source.index(r'\frac')
        numerator, after = group(source, at + 5)
        denominator, end = group(source, after)
        source = source[:at] + '((' + arithmetic(numerator) + ')/(' + arithmetic(denominator) + '))' + source[end:]
    source = re.sub(r'\\log_(\{[^{}]+\}|\d+)\s*\(([^()]*)\)',
                    lambda m: 'lg((' + m[2] + '),(' + m[1].strip('{}') + '))', source)
    special = {('sin', 30): Fraction(1, 2), ('cos', 60): Fraction(1, 2), ('tan', 45): Fraction(1)}
    source = re.sub(r'\\(sin|cos|tan)\s*(\d+)\s*\^\{?\\circ\}?',
                    lambda m: '(' + str(special[(m[1], int(m[2]))]) + ')', source)
    source = re.sub(r'\|([^|]+)\|', r'av(\1)', source)
    source = source.replace('^', '**').replace('{', '(').replace('}', ')').replace('[', '(').replace(']', ')')
    source = re.sub(r'(\d|\))(?=(?:x|u|lg\())', r'\1*', source)
    source = re.sub(r'(\d|\)|x|u)(?=\()', r'\1*', source)
    if '\\' in source:
        raise ValueError('unsupported TeX command')
    return source


def value(source, variables=None):
    tree = ast.parse(arithmetic(source), mode='eval')
    if sum(1 for _ in ast.walk(tree)) > 500:
        raise ValueError('too many operations')
    variables = variables or {}

    def visit(node):
        if isinstance(node, ast.Expression):
            return visit(node.body)
        if isinstance(node, ast.Constant) and type(node.value) in (int, float):
            return Fraction(str(node.value))
        if isinstance(node, ast.Name) and node.id in variables:
            return Fraction(variables[node.id])
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.USub, ast.UAdd)):
            return -visit(node.operand) if isinstance(node.op, ast.USub) else visit(node.operand)
        if isinstance(node, ast.BinOp):
            a, b = visit(node.left), visit(node.right)
            if isinstance(node.op, ast.Add):
                return a + b
            if isinstance(node.op, ast.Sub):
                return a - b
            if isinstance(node.op, ast.Mult):
                return a * b
            if isinstance(node.op, ast.Div):
                return a / b
            if isinstance(node.op, ast.Pow) and b.denominator == 1 and abs(b) <= 128:
                return a ** int(b)
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == 'lg' and len(node.args) == 2:
            arg, base = (visit(v) for v in node.args)
            if arg <= 0 or base <= 0 or base == 1:
                raise ValueError('invalid logarithm domain')
            for power in range(-64, 65):
                if base ** power == arg:
                    return Fraction(power)
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == 'av' and len(node.args) == 1:
            return abs(visit(node.args[0]))
        raise ValueError('unsupported arithmetic expression')

    return visit(tree)


def from_prompt(question):
    """Limited independent check; never derives an answer from the stored key."""
    prompt = question['prompt']
    spans = re.findall(r'(?<!\\)\$([^$]+)\$', prompt)
    family = question['explanation_json'].get('conceptFamily')
    if prompt.startswith('Hitung ') and len(spans) == 1:
        return value(spans[0])
    assignment = next((re.fullmatch(r'x=(-?\d+)', text) for text in spans if re.fullmatch(r'x=(-?\d+)', text)), None)
    if assignment and ('hitung' in prompt.lower() or 'berapa nilai' in prompt.lower()):
        return value(spans[-1], {'x': Fraction(assignment[1])})
    if ('Tentukan $x$ jika' in prompt or 'Nilai $\\square$ memenuhi' in prompt or 'Bilangan dalam kotak memenuhi' in prompt or '$\\square$ memenuhi' in prompt):
        equation = next((part for part in spans if '=' in part and ('x' in part or r'\square' in part)), None)
        if equation:
            left, right = equation.split('=', 1)
            def diff(x):
                return value(left, {'x': x}) - value(right, {'x': x})
            y0, y1, y2 = diff(0), diff(1), diff(2)
            if y1 != y0 and y2 - y1 == y1 - y0:
                return -y0 / (y1 - y0)
    if family == 'elapsed-time':
        clocks = re.findall(r'pukul (\d{2})\.(\d{2})', prompt)
        if len(clocks) == 2:
            start, end = [int(h) * 60 + int(m) for h, m in clocks]
            if end < start:
                end += 24 * 60
            pause = re.search(r'istirahat (\d+) menit', prompt)
            return Fraction(end - start - (int(pause[1]) if pause else 0))
        duration = re.search(r'(\d+) jam (\d+) menit', prompt)
        if duration:
            return Fraction(60 * int(duration[1]) + int(duration[2]))
    if family == 'box-constraints':
        numbers = [int(n) for n in re.findall(r'\d+', prompt)]
        if 'Kotak A berisi' in prompt:
            return Fraction(4 * numbers[0])
        if 'Kotak C dua kali isi B' in prompt:
            return Fraction(numbers[1] + numbers[0], 2)
        return Fraction(numbers[1] - numbers[0], 2)
    if family == 'concentration':
        volumes = [Fraction(n) for n in re.findall(r'(\d+) mL', prompt)]
        percentages = [Fraction(n) for n in re.findall(r'(\d+)%', prompt)]
        if len(volumes) == 1:
            return volumes[0] * percentages[0] / 100
        return sum(v * p for v, p in zip(volumes[:2], percentages)) / sum(volumes)
    return None


def audit(items):
    failures, derived, unsupported = [], 0, 0
    misconception_options = 0
    for question in items:
        try:
            explanation = question['explanation_json']
            expected = value(explanation['expectedSolution'])
            options = {option['id']: value(option['text']) for option in question['options_json']}
            if len(options) != 4 or len(set(options.values())) != 4 or list(options.values()).count(expected) != 1:
                raise ValueError('EQUIVALENT_OR_AMBIGUOUS_OPTIONS')
            if options[question['correct_option_id']] != expected:
                raise ValueError('INCORRECT_KEY')
            independent = explanation.get('independentRationalValue')
            if independent is not None and value(independent) != expected:
                raise ValueError('STORED_VALUE_MISMATCH')
            for distractor in explanation.get('distractors', []):
                if distractor['optionId'] == question['correct_option_id'] or value(distractor['valueExpression']) != options[distractor['optionId']]:
                    raise ValueError('DISTRACTOR_DERIVATION_MISMATCH')
                misconception_options += 1
            if explanation.get('numericDomain') == 'probability' and any(v < 0 or v > 1 for v in options.values()):
                raise ValueError('IMPOSSIBLE_PROBABILITY_OPTION')
            if explanation.get('numericDomain') == 'count' and any(v < 0 or v.denominator != 1 for v in options.values()):
                raise ValueError('IMPOSSIBLE_COUNT_OPTION')
            try:
                calculated = from_prompt(question)
            except (ValueError, SyntaxError, KeyError):
                calculated = None
                unsupported += 1
            if calculated is not None:
                derived += 1
                if calculated != expected:
                    raise ValueError('DISPLAYED_PROMPT_MISMATCH')
        except (ValueError, KeyError, ZeroDivisionError, StopIteration, SyntaxError, TypeError) as error:
            failures.append({'id': question.get('logical_question_id', 'missing'), 'error': str(error)})
    return {'checked': len(items), 'difficulty': dict(Counter(q['difficulty'] for q in items)), 'failures': failures,
            'misconceptionOptionsChecked': misconception_options, 'independentlyDerivedFromPrompt': derived,
            'unsupportedPromptSyntax': unsupported, 'remainingPromptDerivations': len(items) - derived,
            'method': 'exact rational key/options/distractor audit; limited independent displayed-prompt calculations; other wording requires editorial review'}


if __name__ == '__main__':
    with open(sys.argv[1], encoding='utf8') as source:
        result = audit(json.load(source))
    print(json.dumps(result))
    sys.exit(bool(result['failures']))
