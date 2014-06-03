'use strict';

var _ = require('lodash'),
    inspect = require('util').inspect;

var jsondiffpatch = require('jsondiffpatch').create({
  objectHash: function (obj) {
    return JSON.stringify(obj);
  }
});


function addMatchers() {

  // this == jasmine

  this.addMatchers({

    toDeepEqual: function(expected) {

      // jasmine 1.3.x
      var actual = this.actual;
      var actualClone = _.cloneDeep(actual);
      var expectedClone = _.cloneDeep(expected);

      var result = {
        pass: _.isEqual(actualClone, expectedClone)
      };

      if (!result.pass) {
        console.error(
          '[to-deep-equal] elements do not equal. diff:',
          inspect(jsondiffpatch.diff(actualClone, expectedClone), false, 4));
      }

      // jasmine 1.3.x
      return result.pass;
    }
  });
}

module.exports.addMatchers = addMatchers;
