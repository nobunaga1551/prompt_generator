const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// index.html is two levels up from .github/ci/tests
const html = fs.readFileSync(path.resolve(__dirname, '..', '..', '..', 'index.html'), 'utf8');

describe('generate() behavior', () => {
  let dom;
  let window;
  let document;

  beforeEach(async () => {
    dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'http://localhost' });
    // Wait for scripts to run
    await new Promise((resolve) => {
      dom.window.addEventListener('load', () => setTimeout(resolve, 0));
    });
    window = dom.window;
    document = window.document;
    // Ensure an optional tag (Persona) is visible in tests
    if (window.activeOptional && typeof window.activeOptional.add === 'function') {
      window.activeOptional.add('Persona');
    }
    if (window.tagOrder && !window.tagOrder.includes('Persona')) window.tagOrder.push('Persona');
    if (typeof window.renderPills === 'function') window.renderPills();
    if (typeof window.renderTable === 'function') window.renderTable();
  });

  afterEach(() => {
    dom.window.close();
  });

  test('generates output when Objective is provided', () => {
    const ta = document.querySelector('tr[data-tag="Objective"] textarea');
    expect(ta).not.toBeNull();
    ta.value = 'テスト目的';
    window.generate();
    const out = document.getElementById('outputText').value;
    expect(out).toContain('<Objective>');
    expect(out).toContain('テスト目的');
  });

  test('skips optional empty tags', () => {
    const tObj = document.querySelector('tr[data-tag="Objective"] textarea');
    // create a guaranteed optional tag for testing via UI helper
    const input = document.getElementById('customInput');
    input.value = 'TestOptional';
    if (typeof window.addCustom === 'function') window.addCustom();
    const tPersona = document.querySelector('tr[data-tag="TestOptional"] textarea');
    expect(tPersona).not.toBeNull();
    tObj.value = 'O';
    tPersona.value = '';
    window.generate();
    const out = document.getElementById('outputText').value;
    expect(out).not.toContain('<Persona>');
  });

  test('alerts when required tags missing', () => {
    let alerted = '';
    window.alert = (s) => { alerted = String(s); };
    const tObj = document.querySelector('tr[data-tag="Objective"] textarea');
    // provide some other content so parts.length > 0
    const input = document.getElementById('customInput');
    input.value = 'TestOptional';
    if (typeof window.addCustom === 'function') window.addCustom();
    const tPersona = document.querySelector('tr[data-tag="TestOptional"] textarea');
    if (tPersona) tPersona.value = '補助';
    tObj.value = '';
    window.generate();
    // match by ASCII substring to avoid encoding issues in CI
    expect(alerted).toContain('Objective');
  });
});
