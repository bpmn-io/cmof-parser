'use strict';

const { expect } = require('chai');

const fs = require('fs');

const parseFile = require('../..');

const parserOptions = {
  clean: true,
  prefixNamespaces: {
    'BPMN20.cmof': 'bpmn',
    'BPMNDI.cmof': 'bpmndi',
    'DC.cmof': 'dc',
    'DI.cmof': 'di'
  }
};

function readFile(path) {
  return fs.readFileSync(path, 'utf8');
}


describe('BPMN', function() {

  this.timeout(10000);


  describe('BPMN', function() {

    it('Package', async function() {

      // given
      const file = readFile('test/fixtures/cmof/BPMN20.cmof');

      // when
      const { elementsByType } = await parseFile(file, parserOptions);

      // then
      const pkg = elementsByType[ 'cmof:Package' ][ 0 ];

      expect(pkg.name).to.equal('BPMN20');
      expect(pkg.prefix).to.equal('bpmn');
      expect(pkg.uri).to.equal('http://www.omg.org/spec/BPMN/20100524/MODEL');
    });


    it('bpmn:SubProcess', async function() {

      // given
      const file = readFile('test/fixtures/cmof/BPMN20.cmof');

      const expected = {
        name: 'SubProcess',
        superClass: [
          'Activity',
          'FlowElementsContainer'
        ],
        properties: [
          {
            name: 'triggeredByEvent',
            isAttr: true,
            default: false,
            type: 'Boolean'
          }, {
            name: 'artifacts',
            type: 'Artifact',
            isMany: true
          }
        ]
      };

      // when
      const { elementsById } = await parseFile(file, parserOptions);

      // then
      const subProcess = elementsById[ 'SubProcess' ];

      expect(subProcess).to.deep.eql(expected);
    });


    it('bpmn:ChoreographyLoopType (literal values)', async function() {

      // given
      const file = readFile('test/fixtures/cmof/BPMN20.cmof');

      const expected = {
        name: 'ChoreographyLoopType',
        literalValues: [
          {
            name: 'None'
          }, {
            name: 'Standard'
          }, {
            name: 'MultiInstanceSequential'
          }, {
            name: 'MultiInstanceParallel'
          }
        ]
      };

      // when
      const { elementsById } = await parseFile(file, parserOptions);

      // then
      const loopType = elementsById[ 'ChoreographyLoopType' ];

      expect(loopType).to.deep.eql(expected);
    });


    it('bpmn:SequenceFlow (complex-attr-reference)', async function() {

      // given
      const file = readFile('test/fixtures/cmof/BPMN20.cmof');

      const expected = {
        name: 'SequenceFlow',
        superClass: [ 'FlowElement' ],
        properties: [
          {
            name: 'isImmediate',
            isAttr: true,
            type: 'Boolean'
          }, {
            name: 'conditionExpression',
            type: 'Expression',
          }, {
            name: 'sourceRef',
            type: 'FlowNode',
            isAttr: true,
            isReference: true
          }, {
            name: 'targetRef',
            type: 'FlowNode',
            isAttr: true,
            isReference: true
          }
        ]
      };

      // when
      const { elementsById } = await parseFile(file, parserOptions);

      // then
      const sequenceFlow = elementsById[ 'SequenceFlow' ];

      expect(sequenceFlow).to.deep.eql(expected);
    });


    it('bpmn:FlowElement (complex-contain-reference)', async function() {

      // given
      const file = readFile('test/fixtures/cmof/BPMN20.cmof');

      const expected = {
        name: 'FlowNode',
        isAbstract: true,
        superClass: [ 'FlowElement' ],
        properties: [
          {
            name: 'outgoing',
            type: 'SequenceFlow',
            isMany: true,
            isReference: true
          }, {
            name: 'incoming',
            type: 'SequenceFlow',
            isMany: true,
            isReference: true
          }, {
            name: 'lanes',
            type: 'Lane',
            isVirtual: true,
            isMany: true,
            isReference: true
          }
        ]
      };

      // when
      const { elementsById } = await parseFile(file, parserOptions);

      // then
      const flowNode = elementsById[ 'FlowNode' ];

      expect(flowNode).to.deep.eql(expected);
    });

  });


  describe('BPMNDI', function() {

    it('bpmndi:BPMNShape (complex-contain-reference)', async function() {

      // given
      const file = readFile('test/fixtures/cmof/BPMNDI.cmof');

      const expected = {
        name: 'BPMNShape',
        superClass: [ 'di:LabeledShape' ],
        properties: [
          {
            name: 'bpmnElement',
            isAttr: true,
            isReference: true,
            type: 'bpmn:BaseElement',
            redefines: 'di:DiagramElement#modelElement'
          }, {
            name: 'isHorizontal',
            isAttr: true,
            type: 'Boolean'
          }, {
            name: 'isExpanded',
            isAttr: true,
            type: 'Boolean'
          }, {
            name: 'isMarkerVisible',
            isAttr: true,
            type: 'Boolean'
          }, {
            name: 'label',
            type: 'BPMNLabel'
          }, {
            name: 'isMessageVisible',
            isAttr: true,
            type: 'Boolean'
          }, {
            name: 'participantBandKind',
            type: 'ParticipantBandKind',
            isAttr: true
          },
          {
            name: 'choreographyActivityShape',
            type: 'BPMNShape',
            isAttr: true,
            isReference: true
          }
        ]
      };

      // when
      const { elementsById } = await parseFile(file, parserOptions);

      // then
      const bpmnShape = elementsById[ 'BPMNShape' ];

      expect(bpmnShape).to.deep.eql(expected);
    });

  });


  describe('DI', function() {

    it('di:Shape (complex-non-attr-type)', async function() {

      // given
      const file = readFile('test/fixtures/cmof/DI.cmof');

      const expected = {
        name: 'Shape',
        isAbstract: true,
        superClass: [ 'Node' ],
        properties: [
          {
            name: 'bounds',
            type: 'dc:Bounds'
          }
        ]
      };

      // when
      const { elementsById } = await parseFile(file, parserOptions);

      // then
      const shape = elementsById[ 'Shape' ];

      expect(shape).to.deep.eql(expected);
    });

  });

});