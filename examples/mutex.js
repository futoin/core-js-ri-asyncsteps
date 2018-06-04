'use strict';

const $as = require('../lib/main');
const Mutex = require( '../Mutex' );

const mtx = new Mutex();
let curr_concurrency = 0;

for ( let i = 0; i < 3; ++i )
{
    $as()
        .sync(mtx, (as) => {
            // regular AsyncSteps in critical section
            ++curr_concurrency;
            
            as.add((as) => {
                as.success(curr_concurrency--);
            });
        })
        .add((as, val) => {
            console.log(`Max concurrency ${i}: ${val}`);
        })
        .execute();
}

// Max concurrency 0: 1
// Max concurrency 1: 1
// Max concurrency 2: 1
