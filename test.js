const test = require('tape');
const merge = require('./readme');

test('it merges one async finite listenable source', t => {
  t.plan(14);
  const downwardsExpectedType = [
    [0, 'function'],
    [1, 'number'],
    [1, 'number'],
    [1, 'number'],
    [2, 'undefined'],
  ];
  const downwardsExpected = [1, 2, 3];

  function sourceA(type, data) {
    if (type === 0) {
      const sink = data;
      let i = 0;
      const id = setInterval(() => {
        i++;
        sink(1, i);
        if (i === 3) {
          clearInterval(id);
          sink(2);
        }
      }, 100);
      sink(0, sourceA);
    }
  }

  function sink(type, data) {
    const et = downwardsExpectedType.shift();
    t.equals(type, et[0], 'downwards type is expected: ' + et[0]);
    t.equals(typeof data, et[1], 'downwards data type is expected: ' + et[1]);
    if (type === 1) {
      const e = downwardsExpected.shift();
      t.equals(data, e, 'downwards data is expected: ' + e);
    }
  }

  const source = merge(sourceA);
  source(0, sink);

  setTimeout(() => {
    t.pass('nothing else happens');
    t.end();
  }, 700);
});

test('it merges two async finite listenable sources', t => {
  t.plan(17);
  const downwardsExpectedType = [
    [0, 'function'],
    [1, 'number'],
    [1, 'number'],
    [1, 'string'],
    [1, 'number'],
    [2, 'undefined'],
  ];
  const downwardsExpected = [1, 2, 'a', 3];

  function sourceA(type, data) {
    if (type === 0) {
      const sink = data;
      let i = 0;
      const id = setInterval(() => {
        i++;
        sink(1, i);
        if (i === 3) {
          clearInterval(id);
          sink(2);
        }
      }, 100);
      sink(0, sourceA);
    }
  }

  function sourceB(type, data) {
    if (type === 0) {
      const sink = data;
      setTimeout(() => {
        sink(1, 'a');
        setTimeout(() => {
          sink(2);
        }, 250);
      }, 250);
      sink(0, sourceB);
    }
  }

  function sink(type, data) {
    const et = downwardsExpectedType.shift();
    t.equals(type, et[0], 'downwards type is expected: ' + et[0]);
    t.equals(typeof data, et[1], 'downwards data type is expected: ' + et[1]);
    if (type === 1) {
      const e = downwardsExpected.shift();
      t.equals(data, e, 'downwards data is expected: ' + e);
    }
  }

  const source = merge(sourceA, sourceB);
  source(0, sink);

  setTimeout(() => {
    t.pass('nothing else happens');
    t.end();
  }, 700);
});

test('it returns a source that disposes upon upwards END', t => {
  t.plan(16);
  const upwardsExpected = [[0, 'function'], [2, 'undefined']];
  const downwardsExpectedType = [
    [0, 'function'],
    [1, 'number'],
    [1, 'number'],
    [1, 'number'],
  ];
  const downwardsExpected = [10, 20, 30];

  function makeSource() {
    let sent = 0;
    let id;
    const source = (type, data) => {
      const e = upwardsExpected.shift();
      t.equals(type, e[0], 'upwards type is expected: ' + e[0]);
      t.equals(typeof data, e[1], 'upwards data is expected: ' + e[1]);
      if (type === 0) {
        const sink = data;
        id = setInterval(() => {
          sink(1, ++sent * 10);
        }, 100);
        sink(0, source);
      } else if (type === 2) {
        clearInterval(id);
      }
    };
    return source;
  }

  function makeSink(type, data) {
    let talkback;
    return (type, data) => {
      const et = downwardsExpectedType.shift();
      t.equals(type, et[0], 'downwards type is expected: ' + et[0]);
      t.equals(typeof data, et[1], 'downwards data type is expected: ' + et[1]);
      if (type === 0) {
        talkback = data;
      }
      if (type === 1) {
        const e = downwardsExpected.shift();
        t.equals(data, e, 'downwards data is expected: ' + e);
      }
      if (downwardsExpected.length === 0) {
        talkback(2);
      }
    };
  }

  const source = merge(makeSource());
  const sink = makeSink();
  source(0, sink);

  setTimeout(() => {
    t.pass('nothing else happens');
    t.end();
  }, 700);
});

test('it greets the sink as soon as the first member-source greets', t => {
  t.plan(11);
  const downwardsExpectedType = [
    [0, 'function'],
    [1, 'number'],
    [1, 'number'],
    [1, 'string'],
    [2, 'undefined'],
  ];
  const downwardsExpected = [10, 20, 'a'];
  let sinkGreeted = false;

  function quickSource(start, sink) {
    if (start !== 0) return;
    t.equals(sinkGreeted, false, 'sink not yet greeted before any member-source greets');
    sink(0, quickSource);
    t.equals(sinkGreeted, true, 'sink greeted right after quick member-source greets');
    sink(1, 10);
    sink(1, 20);
    sink(2);
  }

  function slowSource(start, sink) {
    if (start !== 0) return;
    setTimeout(() => {
      sink(0, slowSource);
      sink(1, 'a');
      sink(2);
    }, 50);
  }

  function sink(type, data) {
    const et = downwardsExpectedType.shift();
    t.deepEquals([type, typeof data], et, 'downwards type is expected: ' + et);
    if (type === 0) {
      sinkGreeted = true;
    }
    if (type === 1) {
      const e = downwardsExpected.shift();
      t.equals(data, e, 'downwards data is expected: ' + e);
    }
  }

  const source = merge(quickSource, slowSource);
  source(0, sink);

  setTimeout(() => {
    t.pass('nothing else happens');
    t.end();
  }, 500);
});

test('it merges sync listenable sources, resilient to greet/terminate race conditions, part 1', t => {
  t.plan(9);
  const downwardsExpectedType = [
    [0, 'function'],
    [1, 'number'],
    [1, 'number'],
    [1, 'string'],
    [2, 'undefined'],
  ];
  const downwardsExpected = [10, 20, 'a'];

  function sourceA(start, sink) {
    if (start !== 0) return;
    sink(0, sourceA);
    sink(1, 10);
    sink(1, 20);
    sink(2);
  }

  function sourceB(start, sink) {
    if (start !== 0) return;
    sink(0, sourceB);
    setTimeout(() => {
      sink(1, 'a');
      sink(2);
    }, 50);
  }

  function sink(type, data) {
    const et = downwardsExpectedType.shift();
    t.deepEquals([type, typeof data], et, 'downwards type is expected: ' + et);
    if (type === 1) {
      const e = downwardsExpected.shift();
      t.equals(data, e, 'downwards data is expected: ' + e);
    }
  }

  const source = merge(sourceA, sourceB);
  source(0, sink);

  setTimeout(() => {
    t.pass('nothing else happens');
    t.end();
  }, 500);
});

test('it merges sync listenable sources, resilient to greet/terminate race conditions, part 2', t => {
  t.plan(9);
  const downwardsExpectedType = [
    [0, 'function'],
    [1, 'number'],
    [1, 'number'],
    [1, 'string'],
    [2, 'undefined'],
  ];
  const downwardsExpected = [10, 20, 'a'];

  function sourceA(start, sink) {
    if (start !== 0) return;
    sink(0, sourceA);
    sink(1, 10);
    sink(1, 20);
    sink(2);
  }

  function sourceB(start, sink) {
    if (start !== 0) return;
    sink(0, sourceB);
    setTimeout(() => {
      sink(1, 'a');
      sink(2);
    }, 50);
  }

  function sink(type, data) {
    const et = downwardsExpectedType.shift();
    t.deepEquals([type, typeof data], et, 'downwards type is expected: ' + et);
    if (type === 1) {
      const e = downwardsExpected.shift();
      t.equals(data, e, 'downwards data is expected: ' + e);
    }
  }

  const source = merge(sourceB, sourceA);
  source(0, sink);

  setTimeout(() => {
    t.pass('nothing else happens');
    t.end();
  }, 500);
});


test('all sources get requests from sinks', t => {
  let history = [];
  const report = (name,dir,t,d) => t !== 0 && history.push([name,dir,t,d]);

  const source1 = makeMockCallbag('source1', report, true);
  const source2 = makeMockCallbag('source2', report, true);
  const source3 = makeMockCallbag('source3', report, true);
  const sink = makeMockCallbag('sink');

  merge(source1, source2, source3)(0, sink);

  sink.emit(1);
  sink.emit(2);

  t.deepEqual(history, [
    ['source1', 'fromDown', 1, undefined],
    ['source2', 'fromDown', 1, undefined],
    ['source3', 'fromDown', 1, undefined],
    ['source1', 'fromDown', 2, undefined],
    ['source2', 'fromDown', 2, undefined],
    ['source3', 'fromDown', 2, undefined],
  ], 'sources all get requests from sink');

  t.end();
});

function makeMockCallbag(name, report=()=>{}, isSource) {
  if (report === true) {
    isSource = true;
    report = ()=>{};
  }
  let talkback;
  let mock = (t, d) => {
    report(name, 'fromUp', t, d);
    if (t === 0){
      talkback = d;
      if (isSource) talkback(0, (st, sd) => report(name, 'fromDown', st, sd));
    }
  };
  mock.emit = (t, d) => talkback(t, d);
  return mock;
}
