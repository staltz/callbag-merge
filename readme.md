# callbag-merge

Callbag factory that merges data from multiple callbag sources. Works well listenable sources, and while it may work for some pullable sources, it is only designed for listenable sources.

`npm install callbag-merge`

## example

```js
const interval = require('callbag-interval');
const forEach = require('callbag-for-each');
const merge = require('callbag-merge');

const source = merge(interval(100), interval(350));

forEach(x => console.log(x))(source); // 0
                                      // 1
                                      // 2
                                      // 0
                                      // 3
                                      // 4
                                      // 5
                                      // ...
```
