
const thrtl = new Throttle(10, 100);
const as = $as();
const p = as.parallel();
let passed = 0;

for ( let i = 0; i < 100; ++i ) {
    p.add((as) => {
        as.sync(thrtl, (as) => { passed += 1 });
    });
}

as.execute();

setTimeout(() => {
    expect(passed).to.equal(50);
}, 450);
