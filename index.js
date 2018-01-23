function merge(...sources) {
  return (start, sink) => {
    if (start !== 0) return;
    const n = sources.length;
    const sourceTalkbacks = Array(n);
    let startCount = 0;
    let endCount = 0;
    const talkback = t => {
      if (t !== 2) return;
      for (let i = 0; i < n; i++) sourceTalkbacks[i](2);
    };
    for (let i = 0; i < n; i++) {
      sources[i](0, (t, d) => {
        if (t === 0) {
          sourceTalkbacks[i] = d;
          if (++startCount === n) sink(0, talkback);
        } else if (t === 2) {
          if (++endCount === n) sink(2);
        } else sink(t, d);
      });
    }
  };
}

module.exports = merge;
