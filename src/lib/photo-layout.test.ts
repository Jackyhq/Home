import assert from 'node:assert/strict';
import test from 'node:test';
import { partitionItemsByVisualWidth } from './photo-layout';

const item = (id: string, ratio: number) => ({ id, ratio });
const ratioOf = ({ ratio }: { ratio: number }) => ratio;

test('keeps one lane in source order', () => {
  const items = [item('a', 1), item('b', 2)];
  assert.deepEqual(partitionItemsByVisualWidth(items, 1, ratioOf), [items]);
});

test('balances contiguous items by visual width', () => {
  const items = [item('a', 2), item('b', 1), item('c', 1), item('d', 2)];
  const lanes = partitionItemsByVisualWidth(items, 2, ratioOf);

  assert.deepEqual(
    lanes.map((lane) => lane.map(({ id }) => id)),
    [
      ['a', 'b'],
      ['c', 'd'],
    ],
  );
});

test('preserves every item exactly once across lanes', () => {
  const items = [item('a', 0.75), item('b', 1.5), item('c', 1), item('d', 2), item('e', 1)];
  const lanes = partitionItemsByVisualWidth(items, 3, ratioOf);

  assert.equal(lanes.length, 3);
  assert.deepEqual(lanes.flat(), items);
  assert.equal(lanes.every((lane) => lane.length > 0), true);
});
