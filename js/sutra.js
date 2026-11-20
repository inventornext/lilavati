// सूत्र (Sutra): a small programming language with Sanskrit keywords.
// Works in the browser (window.Sutra) and in Node (require('./sutra.js')).
//
//   मान x = ५                      let a variable
//   वद "नमस्ते", x                  print
//   यदि x > ३ { … } अन्यथा { … }     if / else
//   यावत् x < १० { … }               while
//   आवर्तय i = १ तः १० पर्यन्तम् { … } for i from 1 to 10
//   प्रत्येकम् फलम् अस्मिन् सूची { … }   for each item in a list
//   कार्यम् योगः(अ, ब) { प्रत्यर्पय अ + ब }   function and return
//   विरम / अनुवर्तस्व                 break / continue
//   सत्यम् असत्यम् शून्यम्               true false null
//   च  वा  न                         and  or  not
// A danda (। or ॥) ends a statement, like a new line. # starts a comment.

(function (root) {
  'use strict';

  const DEVA = '०१२३४५६७८९';
  const toAscii = s => s.replace(/[०-९]/g, d => DEVA.indexOf(d));
  const toDeva = s => String(s).replace(/[0-9]/g, d => DEVA[d]);

  const KEYWORDS = {
    'मान': 'LET', 'वद': 'PRINT', 'यदि': 'IF', 'अन्यथा': 'ELSE', 'यावत्': 'WHILE',
    'आवर्तय': 'FOR', 'तः': 'FROM', 'पर्यन्तम्': 'TO', 'प्रत्येकम्': 'EACH', 'अस्मिन्': 'IN',
    'कार्यम्': 'FUNC', 'प्रत्यर्पय': 'RETURN', 'विरम': 'BREAK', 'अनुवर्तस्व': 'CONTINUE',
    'सत्यम्': 'TRUE', 'असत्यम्': 'FALSE', 'शून्यम्': 'NULL', 'च': 'AND', 'वा': 'OR', 'न': 'NOT'
  };

  class SutraError extends Error {
    constructor(msg, line) { super(msg); this.line = line; }
    toString() { return `दोषः${this.line ? ` (पङ्क्तिः ${toDeva(this.line)})` : ''}: ${this.message}`; }
  }

  // ---------- tokenizer ----------
  const isStart = c => /[\p{L}\p{M}_]/u.test(c);
  const isPart = c => /[\p{L}\p{M}\p{N}_]/u.test(c) && c !== '।' && c !== '॥';
  function tokenize(src) {
    const out = []; let i = 0, line = 1;
    const push = (type, value) => out.push({ type, value, line });
    while (i < src.length) {
      const c = src[i];
      if (c === '\n' || c === '।' || c === '॥') { push('NL'); if (c === '\n') line++; i++; continue; }
      if (c === ' ' || c === '\t' || c === '\r' || c === '‌' || c === '‍') { i++; continue; }
      if (c === '#') { while (i < src.length && src[i] !== '\n') i++; continue; }
      if (/[0-9०-९]/.test(c)) {
        let j = i; while (j < src.length && /[0-9०-९]/.test(src[j])) j++;
        if (src[j] === '.' && /[0-9०-९]/.test(src[j + 1] || '')) { j++; while (j < src.length && /[0-9०-९]/.test(src[j])) j++; }
        push('NUM', parseFloat(toAscii(src.slice(i, j)))); i = j; continue;
      }
      if (c === '"' || c === "'" || c === '“' || c === '”') {
        const close = c === '“' ? '”' : c; let j = i + 1, s = '';
        while (j < src.length && src[j] !== close && !(close === '"' && src[j] === '”')) {
          if (src[j] === '\n') throw new SutraError('A text in quotes was not closed. · उद्धरणं न समाप्तम्', line);
          if (src[j] === '\\' && j + 1 < src.length) { const e = src[j + 1]; s += e === 'n' ? '\n' : e === 't' ? '\t' : e; j += 2; continue; }
          s += src[j++];
        }
        if (j >= src.length) throw new SutraError('A text in quotes was not closed. · उद्धरणं न समाप्तम्', line);
        push('STR', s); i = j + 1; continue;
      }
      if (isStart(c)) {
        let j = i + 1; while (j < src.length && isPart(src[j])) j++;
        const w = src.slice(i, j);
        if (KEYWORDS[w]) push(KEYWORDS[w], w); else push('ID', w);
        i = j; continue;
      }
      const two = src.slice(i, i + 2);
      if (['==', '!=', '<=', '>=', '&&', '||'].includes(two)) { push('OP', two); i += 2; continue; }
      if ('+-*/%^<>=(){}[],!'.includes(c)) { push('OP', c); i++; continue; }
      throw new SutraError(`Unknown symbol “${c}”. · अज्ञातं चिह्नम्`, line);
    }
    push('NL'); push('EOF');
    return out;
  }

  // ---------- parser ----------
  function parse(tokens) {
    let p = 0;
    const peek = (k = 0) => tokens[p + k];
    const at = (type, value) => peek().type === type && (value === undefined || peek().value === value);
    const op = v => at('OP', v);
    const next = () => tokens[p++];
    const skipNL = () => { while (at('NL')) p++; };
    const expect = (type, value, what) => {
      if (at(type, value)) return next();
      const t = peek();
      throw new SutraError(`Expected ${what} here${t.type === 'EOF' ? ', but the program ended' : `, but found “${t.value === undefined ? 'end of line' : t.value}”`}.`, t.line);
    };

    function program() { const body = []; skipNL(); while (!at('EOF')) { body.push(statement()); endStmt(); } return body; }
    function endStmt() { if (at('NL')) { skipNL(); return; } if (at('EOF') || op('}')) return; const t = peek(); throw new SutraError(`Unexpected “${t.value}”. Put each statement on its own line, or end it with ।`, t.line); }
    function block() {
      skipNL(); expect('OP', '{', '{'); const body = []; skipNL();
      while (!op('}')) { if (at('EOF')) throw new SutraError('A block opened with { was never closed with }.', peek().line); body.push(statement()); endStmt(); }
      next(); return body;
    }
    function statement() {
      const t = peek(), line = t.line;
      switch (t.type) {
        case 'LET': { next(); const name = expect('ID', undefined, 'a name').value; expect('OP', '=', '='); return { k: 'let', name, value: expr(), line }; }
        case 'PRINT': { next(); const args = at('NL') || at('EOF') ? [] : [expr()]; while (op(',')) { next(); args.push(expr()); } return { k: 'print', args, line }; }
        case 'IF': {
          next(); const test = expr(); const then = block(); let other = null;
          const save = p; skipNL();
          if (at('ELSE')) { next(); if (at('IF')) other = [statement()]; else other = block(); } else p = save;
          return { k: 'if', test, then, other, line };
        }
        case 'WHILE': { next(); const test = expr(); return { k: 'while', test, body: block(), line }; }
        case 'FOR': {
          next(); const name = expect('ID', undefined, 'a counter name').value; expect('OP', '=', '=');
          const from = expr(); expect('FROM', undefined, 'तः (from)'); const to = expr(); expect('TO', undefined, 'पर्यन्तम् (up to)');
          return { k: 'for', name, from, to, body: block(), line };
        }
        case 'EACH': { next(); const name = expect('ID', undefined, 'a name').value; expect('IN', undefined, 'अस्मिन् (in)'); const list = expr(); return { k: 'each', name, list, body: block(), line }; }
        case 'FUNC': {
          next(); const name = expect('ID', undefined, 'a function name').value; expect('OP', '(', '(');
          const params = []; if (!op(')')) { params.push(expect('ID', undefined, 'a parameter name').value); while (op(',')) { next(); params.push(expect('ID', undefined, 'a parameter name').value); } }
          expect('OP', ')', ')'); return { k: 'func', name, params, body: block(), line };
        }
        case 'RETURN': { next(); return { k: 'return', value: at('NL') || at('EOF') || op('}') ? null : expr(), line }; }
        case 'BREAK': next(); return { k: 'break', line };
        case 'CONTINUE': next(); return { k: 'continue', line };
      }
      const e = expr();
      if (op('=')) {
        if (e.k !== 'name' && e.k !== 'index') throw new SutraError('Only a name or a list item can be given a new value.', line);
        next(); return { k: 'assign', target: e, value: expr(), line };
      }
      return { k: 'expr', e, line };
    }
    // precedence: वा < च < न < comparison < + - < * / % < unary - < ^ < call/index
    function expr() { return or(); }
    function or() { let l = and(); while (at('OR') || op('||')) { const line = next().line; l = { k: 'or', l, r: and(), line }; } return l; }
    function and() { let l = not(); while (at('AND') || op('&&')) { const line = next().line; l = { k: 'and', l, r: not(), line }; } return l; }
    function not() { if (at('NOT') || op('!')) { const line = next().line; return { k: 'not', e: not(), line }; } return cmp(); }
    function cmp() { let l = add(); while (['==', '!=', '<', '>', '<=', '>='].some(o => op(o))) { const t = next(); l = { k: 'bin', o: t.value, l, r: add(), line: t.line }; } return l; }
    function add() { let l = mul(); while (op('+') || op('-')) { const t = next(); l = { k: 'bin', o: t.value, l, r: mul(), line: t.line }; } return l; }
    function mul() { let l = unary(); while (op('*') || op('/') || op('%')) { const t = next(); l = { k: 'bin', o: t.value, l, r: unary(), line: t.line }; } return l; }
    function unary() { if (op('-')) { const line = next().line; return { k: 'neg', e: unary(), line }; } return pow(); }
    function pow() { const l = postfix(); if (op('^')) { const t = next(); return { k: 'bin', o: '^', l, r: unary(), line: t.line }; } return l; }
    function postfix() {
      let e = primary();
      for (;;) {
        if (op('(')) { const line = next().line; const args = []; if (!op(')')) { args.push(expr()); while (op(',')) { next(); args.push(expr()); } } expect('OP', ')', ')'); e = { k: 'call', f: e, args, line }; }
        else if (op('[')) { const line = next().line; const i = expr(); expect('OP', ']', ']'); e = { k: 'index', obj: e, i, line }; }
        else return e;
      }
    }
    function primary() {
      const t = next();
      switch (t.type) {
        case 'NUM': return { k: 'num', v: t.value };
        case 'STR': return { k: 'str', v: t.value };
        case 'TRUE': return { k: 'lit', v: true };
        case 'FALSE': return { k: 'lit', v: false };
        case 'NULL': return { k: 'lit', v: null };
        case 'ID': return { k: 'name', name: t.value, line: t.line };
        case 'OP':
          if (t.value === '(') { const e = expr(); expect('OP', ')', ')'); return e; }
          if (t.value === '[') { const items = []; skipNL(); if (!op(']')) { items.push(expr()); skipNL(); while (op(',')) { next(); skipNL(); items.push(expr()); skipNL(); } } expect('OP', ']', ']'); return { k: 'list', items, line: t.line }; }
      }
      throw new SutraError(t.type === 'EOF' ? 'The program ended too early.' : `“${t.value === undefined ? 'end of line' : t.value}” cannot start a value here.`, t.line);
    }
    return program();
  }

  // ---------- interpreter ----------
  class Return { constructor(v) { this.v = v; } }
  const BREAK = { brk: 1 }, CONTINUE = { cont: 1 };

  function show(v, inList) {
    if (v === null || v === undefined) return 'शून्यम्';
    if (v === true) return 'सत्यम्';
    if (v === false) return 'असत्यम्';
    if (typeof v === 'number') {
      if (!isFinite(v)) return v > 0 ? '∞' : v < 0 ? '-∞' : 'अनिर्धार्यम्';
      return toDeva(String(Math.round(v * 1e10) / 1e10));
    }
    if (Array.isArray(v)) return '[' + v.map(x => show(x, true)).join(', ') + ']';
    if (v && v.fn) return `कार्यम् ${v.name}`;
    return inList ? `"${v}"` : String(v);
  }
  const typeName = v => v === null ? 'शून्यम्' : typeof v === 'number' ? 'संख्या (number)' : typeof v === 'string' ? 'पाठः (text)' : typeof v === 'boolean' ? 'सत्यासत्य (true/false)' : Array.isArray(v) ? 'सूची (list)' : 'कार्यम् (function)';
  const truthy = v => !(v === false || v === null || v === 0 || v === '' || v === undefined);
  const equal = (a, b) => Array.isArray(a) && Array.isArray(b) ? a.length === b.length && a.every((x, i) => equal(x, b[i])) : a === b;

  function run(src, opts = {}) {
    const out = [];
    const print = opts.print || (s => out.push(s));
    const maxSteps = opts.maxSteps || 2000000;
    let steps = 0;
    const tick = line => { if (++steps > maxSteps) throw new SutraError('The program ran too long (maybe a loop never ends). · अनन्तं चक्रम्?', line); };

    const global = new Map();
    const num = (v, line, what) => { if (typeof v !== 'number') throw new SutraError(`${what} needs a number, but got ${typeName(v)}.`, line); return v; };
    const builtin = (name, f) => global.set(name, { fn: true, name, native: f });
    builtin('दैर्घ्यम्', (line, x) => { if (typeof x === 'string') return [...x].length; if (Array.isArray(x)) return x.length; throw new SutraError('दैर्घ्यम् (length) needs a text or a list.', line); });
    builtin('योजय', (line, list, x) => { if (!Array.isArray(list)) throw new SutraError('योजय (append) needs a list first.', line); list.push(x); return list; });
    builtin('मूलम्', (line, x) => Math.sqrt(num(x, line, 'मूलम् (square root)')));
    builtin('पूर्णाङ्कः', (line, x) => Math.floor(num(x, line, 'पूर्णाङ्कः (whole number)')));
    builtin('निरपेक्षम्', (line, x) => Math.abs(num(x, line, 'निरपेक्षम् (absolute value)')));
    builtin('यादृच्छिकम्', (line, a, b) => { num(a, line, 'यादृच्छिकम् (random)'); num(b, line, 'यादृच्छिकम् (random)'); return a + Math.floor(Math.random() * (b - a + 1)); });
    builtin('संख्या', (line, x) => { const n = parseFloat(toAscii(String(x))); if (isNaN(n)) throw new SutraError(`“${show(x)}” is not a number.`, line); return n; });
    builtin('पाठः', (line, x) => show(x));
    builtin('परिधिः', () => Math.PI);

    function lookup(env, name, line) {
      for (let e = env; e; e = e.parent) if (e.vars.has(name)) return e;
      if (global.has(name)) return { vars: global };
      throw new SutraError(`Unknown name “${name}”. Create it first with मान ${name} = … · अज्ञातं नाम`, line);
    }
    const scope = parent => ({ vars: new Map(), parent });

    function exec(body, env) { for (const s of body) stmt(s, env); }
    function stmt(s, env) {
      tick(s.line);
      switch (s.k) {
        case 'let': env.vars.set(s.name, ev(s.value, env)); return;
        case 'print': print(s.args.map(a => show(ev(a, env))).join(' ')); return;
        case 'if': if (truthy(ev(s.test, env))) exec(s.then, scope(env)); else if (s.other) exec(s.other, scope(env)); return;
        case 'while': while (truthy(ev(s.test, env))) { tick(s.line); try { exec(s.body, scope(env)); } catch (x) { if (x === BREAK) break; if (x === CONTINUE) continue; throw x; } } return;
        case 'for': {
          const a = num(ev(s.from, env), s.line, 'आवर्तय'), b = num(ev(s.to, env), s.line, 'आवर्तय');
          // counts upward; if the start is past the end, the loop does not run
          for (let i = a; i <= b; i++) {
            tick(s.line); const e = scope(env); e.vars.set(s.name, i);
            try { exec(s.body, e); } catch (x) { if (x === BREAK) break; if (x === CONTINUE) continue; throw x; }
          }
          return;
        }
        case 'each': {
          let list = ev(s.list, env);
          if (typeof list === 'string') list = [...list];
          if (!Array.isArray(list)) throw new SutraError('प्रत्येकम् needs a list or a text after अस्मिन्.', s.line);
          for (const item of list.slice()) {
            tick(s.line); const e = scope(env); e.vars.set(s.name, item);
            try { exec(s.body, e); } catch (x) { if (x === BREAK) break; if (x === CONTINUE) continue; throw x; }
          }
          return;
        }
        case 'func': env.vars.set(s.name, { fn: true, name: s.name, params: s.params, body: s.body, env }); return;
        case 'return': throw new Return(s.value ? ev(s.value, env) : null);
        case 'break': throw BREAK;
        case 'continue': throw CONTINUE;
        case 'assign': {
          const v = ev(s.value, env);
          if (s.target.k === 'name') { lookup(env, s.target.name, s.line).vars.set(s.target.name, v); return; }
          const obj = ev(s.target.obj, env), i = ev(s.target.i, env);
          if (!Array.isArray(obj)) throw new SutraError('Only a list item can be changed with [ ].', s.line);
          const k = index(obj, i, s.line); obj[k] = v; return;
        }
        case 'expr': ev(s.e, env); return;
      }
    }
    // lists count from १, as people do when they count
    function index(obj, i, line) {
      num(i, line, 'An index');
      const k = i - 1;
      if (!Number.isInteger(i) || k < 0 || k >= obj.length) throw new SutraError(`Index ${show(i)} is outside the list (it has ${show(obj.length)} items, counted from १).`, line);
      return k;
    }
    function ev(e, env) {
      switch (e.k) {
        case 'num': case 'str': case 'lit': return e.v;
        case 'name': return lookup(env, e.name, e.line).vars.get(e.name);
        case 'list': return e.items.map(x => ev(x, env));
        case 'neg': return -num(ev(e.e, env), e.line, '−');
        case 'not': return !truthy(ev(e.e, env));
        case 'and': { const l = ev(e.l, env); return truthy(l) ? ev(e.r, env) : l; }
        case 'or': { const l = ev(e.l, env); return truthy(l) ? l : ev(e.r, env); }
        case 'index': {
          const obj = ev(e.obj, env), i = ev(e.i, env);
          if (typeof obj === 'string') return [...obj][index([...obj], i, e.line)];
          if (!Array.isArray(obj)) throw new SutraError('[ ] works only on a list or a text.', e.line);
          return obj[index(obj, i, e.line)];
        }
        case 'call': {
          const f = ev(e.f, env), args = e.args.map(a => ev(a, env));
          if (!f || !f.fn) throw new SutraError(`${show(f)} is not a कार्यम् (function).`, e.line);
          if (f.native) return f.native(e.line, ...args);
          if (args.length !== f.params.length) throw new SutraError(`${f.name} needs ${show(f.params.length)} value(s), but got ${show(args.length)}.`, e.line);
          if (++depth > 2000) { depth = 0; throw new SutraError('Too many calls inside calls (a function may call itself forever).', e.line); }
          const local = scope(f.env); f.params.forEach((p, i) => local.vars.set(p, args[i]));
          try { exec(f.body, local); return null; } catch (x) { if (x instanceof Return) return x.v; throw x; } finally { depth--; }
        }
        case 'bin': {
          const a = ev(e.l, env), b = ev(e.r, env), o = e.o;
          if (o === '==') return equal(a, b);
          if (o === '!=') return !equal(a, b);
          if (o === '+') {
            if (typeof a === 'string' || typeof b === 'string') return show(a) + show(b);
            if (Array.isArray(a) && Array.isArray(b)) return a.concat(b);
          }
          if (['<', '>', '<=', '>='].includes(o) && typeof a === 'string' && typeof b === 'string') return o === '<' ? a < b : o === '>' ? a > b : o === '<=' ? a <= b : a >= b;
          num(a, e.line, `“${o}”`); num(b, e.line, `“${o}”`);
          switch (o) {
            case '+': return a + b; case '-': return a - b; case '*': return a * b;
            case '/': if (b === 0) throw new SutraError('Cannot divide by zero (शून्येन भागः).', e.line); return a / b;
            case '%': return a % b; case '^': return a ** b;
            case '<': return a < b; case '>': return a > b; case '<=': return a <= b; case '>=': return a >= b;
          }
        }
      }
      throw new SutraError('Something unexpected happened.', e.line);
    }
    let depth = 0;
    try {
      exec(parse(tokenize(src)), scope(null));
    } catch (x) {
      if (x instanceof Return) return { output: out, ok: true };
      if (x === BREAK || x === CONTINUE) return { output: out, ok: false, error: new SutraError('विरम / अनुवर्तस्व can only be used inside a loop.') };
      if (x instanceof SutraError) return { output: out, ok: false, error: x };
      if (x instanceof RangeError) return { output: out, ok: false, error: new SutraError('Too many calls inside calls (a function may call itself forever).') };
      throw x;
    }
    return { output: out, ok: true };
  }

  const Sutra = { run, tokenize, parse, show, KEYWORDS, SutraError, toDeva };
  if (typeof module !== 'undefined' && module.exports) module.exports = Sutra;
  else root.Sutra = Sutra;
})(typeof window !== 'undefined' ? window : globalThis);
