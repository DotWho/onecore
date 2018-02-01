var module1 = (function () {
    var _e = {};

    _e.test = function () {
        var x = [];
        let s = {
            'id': 1
        };
        x.push(s);
        return x;
    };

    _e.dome = function () {
        return 'dome';
    };

    return _e;
})();

module.exports = module1;
