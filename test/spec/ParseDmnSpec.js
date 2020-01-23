'use strict';

const { expect } = require('chai');

const fs = require('fs');

const parseFile = require('../..');

const parserOptions = {
  clean: true,
  prefixNamespaces: {
    'DC': 'dc',
    'DI': 'di',
    'http://www.omg.org/spec/BMM/20130801/BMM.xmi': 'bmm',
    'http://www.omg.org/spec/BPMN/20100501/BPMN20.cmof': 'bpmn',
    'https://www.omg.org/spec/DMN/20180521/DMNDI12.xmi': 'di'
  }
};

function readFile(path) {
  return fs.readFileSync(path, 'utf8');
}


describe('DMN', function() {

  this.timeout(10000);


  describe('DMN', function() {

    it('should parse package', async function() {

      // given
      const file = readFile('test/fixtures/xmi/DMN12.xmi');

      // when
      const { elementsByType } = await parseFile(file, parserOptions);

      // then
      const pkg = elementsByType[ 'uml:Package' ][ 0 ];

      expect(pkg.prefix).to.equal('dmn');
      expect(pkg.uri).to.equal('http://www.omg.org/spec/DMN/20180521/DMN12');
    });


    it('dmn:DRGElement (complex-attr-reference)', async function() {

      // given
      const file = readFile('test/fixtures/xmi/DMN12.xmi');

      // when
      const { elementsByType } = await parseFile(file, parserOptions);

      // then
      const drgElement = elementsByType[ 'uml:Class' ].find(element => element.name === 'DRGElement');

      expect(drgElement).to.eql({
        name: 'DRGElement',
        isAbstract: true,
        properties: [
          {
            name: 'definitions',
            type: 'Definitions',
            isAttr: true,
            isReference: true
          }
        ],
        superClass: [ 'NamedElement' ]
      });
    });

  });


  describe('DMNDI', function() {

    it('Package', async function() {

      // given
      const file = readFile('test/fixtures/xmi/DMNDI12.xmi');

      // when
      const { elementsByType } = await parseFile(file, parserOptions);

      // then
      const pkg = elementsByType[ 'uml:Package' ][ 0 ];

      expect(pkg.prefix).to.equal('dmndi');
      expect(pkg.uri).to.equal('https://www.omg.org/spec/DMN/20180521/DMNDI12');
    });

  });

});