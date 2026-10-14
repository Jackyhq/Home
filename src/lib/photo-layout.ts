export const partitionItemsByVisualWidth = <Item>(
  items: Item[],
  laneCount: number,
  getRatio: (item: Item) => number,
) => {
  if (laneCount <= 1 || items.length <= 1) return [items];

  const ratios = items.map(getRatio);
  const totalRatio = ratios.reduce((total, ratio) => total + ratio, 0);
  const targetRatio = totalRatio / laneCount;
  const candidates: Item[][][] = [];

  const collectPartitions = (startIndex: number, laneIndex: number, partition: Item[][]) => {
    const remainingLanes = laneCount - laneIndex;
    const remainingItems = items.length - startIndex;

    if (remainingLanes === 1) {
      if (remainingItems >= 1) candidates.push([...partition, items.slice(startIndex)]);
      return;
    }

    const minimumEnd = startIndex + 1;
    const maximumEnd = items.length - (remainingLanes - 1);

    for (let endIndex = minimumEnd; endIndex <= maximumEnd; endIndex += 1) {
      collectPartitions(endIndex, laneIndex + 1, [
        ...partition,
        items.slice(startIndex, endIndex),
      ]);
    }
  };

  collectPartitions(0, 0, []);

  if (candidates.length === 0) {
    const fallback: Item[][] = [];
    let startIndex = 0;

    for (let laneIndex = 0; laneIndex < laneCount; laneIndex += 1) {
      const remainingItems = items.length - startIndex;
      const remainingLanes = laneCount - laneIndex;
      const laneSize = Math.ceil(remainingItems / remainingLanes);
      fallback.push(items.slice(startIndex, startIndex + laneSize));
      startIndex += laneSize;
    }

    return fallback;
  }

  const scorePartition = (partition: Item[][]) => {
    let itemIndex = 0;
    const laneRatios = partition.map((laneItems) => {
      const laneRatio = ratios
        .slice(itemIndex, itemIndex + laneItems.length)
        .reduce((total, ratio) => total + ratio, 0);
      itemIndex += laneItems.length;
      return laneRatio;
    });

    return laneRatios.reduce(
      (total, ratio) => total + Math.pow((ratio - targetRatio) / targetRatio, 2),
      0,
    );
  };

  return candidates.sort((a, b) => scorePartition(a) - scorePartition(b))[0];
};
