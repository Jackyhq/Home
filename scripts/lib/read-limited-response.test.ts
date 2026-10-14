import assert from 'node:assert/strict';
import test from 'node:test';
import { readTextBodyWithLimit, ResponseSizeError } from './read-limited-response';

test('reads a response within the byte limit', async () => {
  const response = new Response('{"ok":true}', {
    headers: { 'content-type': 'application/json' },
  });

  assert.equal(await readTextBodyWithLimit(response, 64), '{"ok":true}');
});

test('rejects a declared response larger than the limit', async () => {
  const response = new Response('small', { headers: { 'content-length': '100' } });

  await assert.rejects(() => readTextBodyWithLimit(response, 10), ResponseSizeError);
});

test('stops reading an undeclared response after it crosses the limit', async () => {
  const response = new Response('this body is too large');

  await assert.rejects(() => readTextBodyWithLimit(response, 8), ResponseSizeError);
});
