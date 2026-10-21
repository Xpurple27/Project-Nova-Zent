"""Read an explicit PRIVATE export; evaluate a small arithmetic grammar, never eval content."""
import ast, json, sys
from fractions import Fraction
from collections import Counter

def value(source):
    tree=ast.parse(str(source).replace('−','-').replace(',','.'),mode='eval')
    def visit(n):
        if isinstance(n,ast.Expression):return visit(n.body)
        if isinstance(n,ast.Constant) and type(n.value) in (int,float):return Fraction(str(n.value))
        if isinstance(n,ast.UnaryOp) and isinstance(n.op,(ast.USub,ast.UAdd)):return -visit(n.operand) if isinstance(n.op,ast.USub) else visit(n.operand)
        if isinstance(n,ast.BinOp):
            a,b=visit(n.left),visit(n.right)
            if isinstance(n.op,ast.Add):return a+b
            if isinstance(n.op,ast.Sub):return a-b
            if isinstance(n.op,ast.Mult):return a*b
            if isinstance(n.op,ast.Div):return a/b
            if isinstance(n.op,ast.Pow) and b.denominator==1 and abs(b)<10000:return a**int(b)
        raise ValueError('unsupported arithmetic expression')
    return visit(tree)

items=json.load(open(sys.argv[1]));failures=[]
for q in items:
    try:
        expected=value(q['explanation_json']['expectedSolution'])
        options=[value(o['text']) for o in q['options_json']]
        correct=next(value(o['text']) for o in q['options_json'] if o['id']==q['correct_option_id'])
        assert len(set(options))==4 and options.count(expected)==1 and correct==expected
        independent=q['explanation_json'].get('independentRationalValue')
        if independent is not None: assert value(independent)==expected
    except (AssertionError,ValueError,KeyError,ZeroDivisionError,StopIteration,SyntaxError):failures.append(q['logical_question_id'])
print(json.dumps({'checked':len(items),'difficulty':dict(Counter(q['difficulty'] for q in items)),'failures':failures,'method':'restricted AST arithmetic with exact rational comparison; prompt derivation reviewed separately'}))
sys.exit(bool(failures))
