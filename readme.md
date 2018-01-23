# callbag-merge

Callbag factory that merges data from multiple callbag sources. Works well listenable sources, and while it may work for some pullable sources, it is only designed for listenable sources.

`npm install callbag-merge`

## example

```js
const interval = require('callbag-interval');
const observe = require('callbag-observe');
const merge = require('callbag-merge');

const source = merge(interval(100), interval(350));

source(0, observe(x => console.log(x)); // 0
                                        // 1
                                        // 2
                                        // 0
                                        // 3
                                        // 4
                                        // 5
                                        // ...
```
