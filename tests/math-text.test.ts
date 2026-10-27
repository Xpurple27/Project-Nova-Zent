import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import MathText from '../src/components/combat/MathText';
import {splitMathText} from '../src/game/questions/math-markup';

test('math delimiters preserve surrounding Indonesian text and support inline/display forms',()=>{
 const parts=splitMathText('Nilai $x^2$ dan \\(\\frac{1}{2}\\). $$a+b$$ \\[c-d\\]',true);
 const math=parts.filter(p=>p.kind==='math');
 assert.deepEqual(math.map(p=>[p.source,p.display]),[['x^2',false],['\\frac{1}{2}',false],['a+b',true],['c-d',true]]);
 assert.equal(parts[0].source,'Nilai ');
 assert.deepEqual(splitMathText('Tulisan biasa.'),[{kind:'text',source:'Tulisan biasa.'}]);
 assert.deepEqual(splitMathText('Harga \\$5'),[{kind:'text',source:'Harga \\$5'}]);
 assert.throws(()=>splitMathText('Nilai $x+1',true),/INVALID_MATH_DELIMITER/);
 assert.throws(()=>splitMathText('Nilai x+1\\)',true),/INVALID_MATH_DELIMITER/);
});

test('formulas render immediately with accessible MathML, without a window global or CDN timer',()=>{
 const html=renderToStaticMarkup(createElement(MathText,{children:'Hitung $\\frac{3}{4}+2^3$ dalam $\\mathrm{cm}^2$.'}));
 assert.match(html,/class="katex"/);assert.match(html,/<math/);assert.match(html,/<mfrac>/);
 assert.doesNotMatch(html,/\$\\frac|katex-error/);
});

test('malformed formulas and hostile text fall back to escaped readable content',()=>{
 const html=renderToStaticMarkup(createElement(MathText,{children:'<img src=x onerror=alert(1)> $\\frac{1}{$'}));
 assert.doesNotMatch(html,/<img|onerror="|<script/);assert.match(html,/&lt;img/);
 assert.match(html,/frac/);
 const hostile=renderToStaticMarkup(createElement(MathText,{children:'$\\href{javascript:alert(1)}{click}$'}));
 assert.doesNotMatch(hostile,/<a\s|href="javascript:/);
});
