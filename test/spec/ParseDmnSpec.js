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
    'https://www.omg.org/spec/DMN/20191111/DMNDI13.xmi': 'dmndi'
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
      const file = readFile('test/fixtures/xmi/DMN13.xmi');

      // when
      const { elementsByType } = await parseFile(file, parserOptions);

      // then
      const pkg = elementsByType[ 'uml:Package' ][ 0 ];

      expect(pkg.name).to.equal('DMN');
      expect(pkg.prefix).to.equal('dmn');
      expect(pkg.uri).to.equal('https://www.omg.org/spec/DMN/20191111/DMN13');
    });


    it('dmn:DRGElement (complex-attr-reference)', async function() {

      // given
      const file = readFile('test/fixtures/xmi/DMN13.xmi');

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
      const file = readFile('test/fixtures/xmi/DMNDI13.xmi');

      // when
      const { elementsByType } = await parseFile(file, parserOptions);

      // then
      const pkg = elementsByType[ 'uml:Package' ][ 0 ];

      expect(pkg.prefix).to.equal('dmndi');
      expect(pkg.uri).to.equal('https://www.omg.org/spec/DMN/20191111/DMNDI13');
    });


    it('should set <isId> for DMNStyle#id', async function() {

      // given
      const file = readFile('test/fixtures/xmi/DMNDI13.xmi');

      // when
      const { elementsByType } = await parseFile(file, parserOptions);

      // then
      const pkg = elementsByType[ 'uml:Package' ][ 0 ];

      const dmnStyle = pkg.types.find(({ name }) => name === 'DMNStyle'),
            id = dmnStyle.properties.find(({ name }) => name === 'id');

      expect(id).to.eql({
        name: 'id',
        isAttr: true,
        type: 'String',
        isId: true
      });
    });
  });

});