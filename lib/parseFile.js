'use strict';

const { isString } = require('min-dash');

const sax = require('sax');

const Stack = require('tiny-stack');

const defaultOptions = {
  clean: false,
  strict: true
};

const XMI_ID = 'xmi:id',
      XMI_TYPE = 'xmi:type';

/**
 * Parse MOF XMI (https://www.omg.org/mof/) and UML XMI (https://www.omg.org/spec/UML) file.
 *
 * @param {String} path
 * @param {Object} [options]
 * @param {boolean} [options.clean=false] - Whether to clean redundant properties.
 * @param {boolean} [options.strict=true] - Whether or not to be a jerk.
 * See https://github.com/isaacs/sax-js#arguments
 *
 * @returns {Object}
 */
module.exports = async function parseFile(file, options = {}) {
  return new Promise((resolve, reject) => {
    options = {
      ...defaultOptions,
      ...options
    };

    const { strict } = options;

    const elementsById = {},
          elementsByType = {};

    const context = {
      elementsById,
      elementsByType,
      ...options
    };

    const stack = new Stack();

    const saxParser = sax.parser(strict);

    saxParser.onerror = function(err) {
      console.error('error', err);

      this._parser.error = null;
      this._parser.resume();

      reject(err);
    };

    saxParser.onopentag = tag => {
      const { name } = tag;

      if (canParse(name, context)) {
        const parser = getParser(name, context);

        if (!parser) {
          throw new Error(`[parser] no parser for tag <${ name }>`);
        }

        const parent = stack.peek();

        const parsed = parser(tag, parent, context);

        if (parsed) {
          stack.push(parsed);
        }
      }
    };

    saxParser.onclosetag = name => {
      if (canParse(name, context)) {
        stack.pop();
      }
    };

    saxParser.onend = () => {
      const { elementsById } = context;

      Object.values(context.elementsById).forEach(element => {
        const {
          properties,
          superClass
        } = element;

        if (properties) {
          properties.forEach(property => {
            if (elementsById[ property.type ]) {

              const type = elementsById[ property.type ].name;

              if (type === 'ID') {
                property.isAttr = true;
                property.isId = true;
              }

              property.type = [ 'URI', 'QName', 'ID' ].includes(type) ? 'String' : type;
            } else if (property.name === 'id') {
              property.isAttr = true;
              property.isId = true;
            }

            if (elementsById[ property.default ]) {
              property.default = elementsById[ property.default ].name;
            }
          });
        }

        if (superClass) {
          element.superClass = superClass.map(superClass => {
            if (elementsById[ superClass ]) {
              return elementsById[ superClass ].name;
            }

            return superClass;
          });
        }
      });

      resolve(context);
    };

    saxParser.write(file).close();
  });
};

function canParse(name, context) {
  return !!getParser(name, context);
}

function createElement(tag, parent, context) {
  const { attributes } = tag;

  const element = {};

  Object.entries(attributes).forEach(([ key, value ]) => {

    if (!key.startsWith('xmi:')) {

      if (value === 'true') {
        value = true;
      }

      if (value === 'false') {
        value = false;
      }

      if (isString(value)) {
        value = replacePrefixWithNamespace(value, context);
      }

      element[ key ] = value;
    }
  });

  element.id = attributes[ XMI_ID ];

  return element;
}

function deleteEntries(object, keys) {
  keys.forEach(key => delete object[ key ]);

  return object;
}

function getCollection(type, context) {
  const { prefix } = context;

  if (!prefix) {
    console.error('prefix not found');

    throw new Error('[parser] prefix not found');
  }

  if (type === `${ prefix }:Association`) {
    return 'associations';
  } else if (type === `${ prefix }:Class` ||
    type === `${ prefix }:DataType` ||
    type === `${ prefix }:PrimitiveType` ||
    type === `${ prefix }:Type`) {
    return 'types';
  } else if (type === `${ prefix }:Enumeration`) {
    return 'enumerations';
  }

  return null;
}

function getParser(name, context) {
  if (name === 'xmi:XMI') {
    return parseXMI;
  }

  const { prefix } = context;

  if (!prefix) {
    console.error('prefix not found');

    throw new Error('[parser] prefix not found');
  }

  if (name === `${ prefix }:Tag`) {
    return parseTag;
  } else if (name === `${ prefix }:Package`) {
    return parsePackage;
  } else if (name === 'defaultValue') {
    return parseDefaultValue;
  } else if (name === 'generalization') {
    return parseGeneralization;
  } else if (name === 'ownedAttribute') {
    return parseOwnedAttribute;
  } else if (name === 'ownedEnd') {
    return parseOwnedEnd;
  } else if (name === 'ownedLiteral') {
    return parseOwnedLiteral;
  } else if (name === 'ownedMember' || name === 'packagedElement') {
    return parseOwnedMember;
  } else if (name === 'redefinedProperty') {
    return parseRedefinedProperty;
  } else if (name === 'superClass') {
    return parseSuperClass;
  } else if (name === 'type') {
    return parseType;
  } else if (name === 'upperValue') {
    return parseUpperValue;
  }
}

function getPrimitiveType(href) {
  const type = href.split('#').pop();

  if (!isPrimitiveType(type)) {
    return null;
  }

  return type;
}

function isPrimitiveType(type) {
  return [ 'Boolean', 'Element', 'Integer', 'Real', 'String' ].includes(type);
}

function parseDefaultValue(tag, parent, context) {
  if (!parent) {
    console.error('[parser] parent not found', tag);

    throw new Error('[parser] parent not found');
  }

  const element = createElement(tag, parent, context);

  const {
    instance,
    value
  } = element;

  parent.default = instance || value;

  return element;
}

function parseGeneralization(tag, parent, context) {
  if (!parent) {
    console.error('[parser] parent not found', tag);

    throw new Error('[parser] parent not found');
  }

  const {
    elementsById,
    elementsByType
  } = context;

  const element = createElement(tag, parent, context);

  const {
    general,
    id
  } = element;

  if (!general) {
    console.error('[parser] generalization not found', tag);

    throw new Error('[parser] generalization not found');
  }

  elementsById[ id ] = element;

  const { attributes } = tag;

  const type = attributes[ XMI_TYPE ];

  if (!elementsByType[ type ]) {
    elementsByType[ type ] = [];
  }

  elementsByType[ type ].push(element);

  if (!parent.superClass) {
    parent.superClass = [];
  }

  parent.superClass.push(general);

  return element;
}

function parseOwnedAttribute(tag, parent, context) {
  const element = createElement(tag, parent, context),
        isComposite = element.isComposite || element.aggregation === 'composite';

  let isMany,
      isVirtual;

  const {
    lower,
    upper
  } = element;

  if (
    (lower === '0' && !upper) ||
    (!lower && !upper)
  ) {
    isMany = false;
  } else {
    isMany = element.isMany = true;
  }

  if (element.isDerived || element.isDerivedUnion) {
    isVirtual = element.isVirtual = true;
  }

  if (!isComposite && !isMany && !isVirtual) {
    element.isAttr = true;
  }

  if (element.type) {
    element.type = replacePrefixWithNamespace(element.type, context);
  }

  if (element.association && !isComposite) {
    element.isReference = true;
  }

  if (context.clean) {
    deleteEntries(element, [
      'aggregation',
      'association',
      'datatype',
      'id',
      'isComposite',
      'isDerived',
      'isDerivedUnion',
      'isOrdered',
      'lower',
      'upper',
      'visibility'
    ]);
  }

  if (!parent) {
    console.error('[parser] parent not found', tag);

    throw new Error('[parent] parent not found');
  }

  parent.properties = parent.properties || [];

  parent.properties.push(element);

  return element;
}

function parseOwnedLiteral(tag, parent, context) {
  const {
    elementsById,
    elementsByType
  } = context;

  const element = createElement(tag, parent, context);

  const { id } = element;

  elementsById[ id ] = element;

  const type = tag.attributes[ XMI_TYPE ];

  if (!elementsByType[ type ]) {
    elementsByType[ type ] = [];
  }

  elementsByType[ type ].push(element);

  if (!parent.literalValues) {
    parent.literalValues = [];
  }

  parent.literalValues.push(element);

  if (context.clean) {
    deleteEntries(element, [
      'classifier',
      'enumeration',
      'id'
    ]);
  }

  return element;
}

function parseOwnedMember(tag, parent, context) {
  const {
    elementsById,
    elementsByType
  } = context;

  const element = createElement(tag, parent, context),
        { id } = element;

  const type = tag.attributes[ XMI_TYPE ];

  // normalize superClass: 'Foo Bar' to superClass: [ 'Foo', 'Bar' ]
  if (element.superClass) {
    element.superClass = element.superClass.split(/\s/).map(type => {
      return replacePrefixWithNamespace(type, context);
    });
  }

  elementsById[ id ] = element;

  deleteEntries(element, [
    'id'
  ]);

  if (!elementsByType[ type ]) {
    elementsByType[ type ] = [];
  }

  elementsByType[ type ].push(element);

  if (!parent) {
    console.error('[parser] parent not found', tag);

    throw new Error('[parent] parent not found');
  }

  const collection = getCollection(type, context);

  if (!collection) {
    return element;
  }

  if (!parent[ collection ]) {
    parent[ collection ] = [];
  }

  parent[ collection ].push(element);

  return element;
}

function parseOwnedEnd(tag, parent, context) {
  const element = createElement(tag, parent, context);

  parent.ownedEnd = element;

  return element;
}

function parsePackage(tag, parent, context) {
  const {
    elementsById,
    elementsByType
  } = context;

  const element = createElement(tag, parent, context);

  const {
    attributes,
    name
  } = tag;

  const id = attributes[ XMI_ID ];

  elementsById[ id ] = element;

  const type = attributes[ XMI_TYPE ] || name;

  if (!elementsByType[ type ]) {
    elementsByType[ type ] = [];
  }

  elementsByType[ type ].push(element);

  // see #parseTag for prefix specified in seperate tag
  element.prefix = attributes[ 'name' ].toLowerCase();

  // see #parseTag for uri specified in seperate tag
  const uri = attributes[ 'uri' ] || attributes[ 'URI' ];

  if (context.clean) {
    deleteEntries(element, [
      'id',
      'URI'
    ]);
  }

  element.uri = uri.replace(/-XMI$|\.xmi/, '');

  return element;
}

function parseRedefinedProperty(tag, parent, context) {
  const href = tag.attributes[ 'href' ];

  if (!parent) {
    console.error('[parser] parent not found', tag);

    throw new Error('[parser] parent not found');
  }

  if (!href) {
    console.error('[parser] href not found', tag);

    throw new Error('[parser] href not found');
  }

  parent.redefines = replacePrefixWithNamespace(href, context).replace('-', '#');

  return {};
}

function parseSuperClass(tag, parent, context) {
  const { attributes } = tag;

  const { href } = attributes;

  let type = getPrimitiveType(href);

  if (!type) {
    type = href;
  }

  if (!parent) {
    console.error('[parser] parent not found', tag);

    throw new Error('[parent] parent not found');
  }

  if (!href) {
    console.error('[parser] href not found', tag);

    throw new Error('[parser] href not found');
  }

  if (!parent.superClass) {
    parent.superClass = [];
  }

  parent.superClass.push(replacePrefixWithNamespace(type, context));

  return type;
}

function parseTag(tag, parent, context) {
  const { elementsById } = context;

  const element = createElement(tag, parent, context),
        referencedElementId = element.element,
        referencedElement = elementsById[ referencedElementId ];

  if (!referencedElement) {
    console.error(`[parser] referenced element <${ referencedElementId }> no found`, tag);

    throw new Error(`[parser] referenced element <${ referencedElementId }> no found`);
  }

  // see #parsePackage for prefix specified in package tag
  if (element.name === 'org.omg.xmi.nsPrefix') {
    referencedElement.prefix = element.value;
  }

  // see #parsePackage for prefix specified in package tag
  if (element.name === 'org.omg.xmi.nsURI') {
    referencedElement.uri = element.value.replace(/-XMI$|\.xmi/, '');
  }

  return element;
}

function parseType(tag, parent, context) {
  const href = tag.attributes[ 'href' ];

  const isPrimitveType = !!getPrimitiveType(href);

  let type = getPrimitiveType(href);

  if (!type) {
    type = href;
  }

  if (!parent) {
    console.error('[parser] parent not found', tag);

    throw new Error('[parent] parent not found');
  }

  if (!href) {
    console.error('[parser] href not found', tag);

    throw new Error('[parser] href not found');
  }

  parent.type = replacePrefixWithNamespace(type, context);

  // complex elements can NOT be attributes
  if (parent.isAttr && !parent.isReference && !isPrimitveType) {
    delete parent.isAttr;
  }

  return type;
}

function parseUpperValue(tag, parent, context) {
  const element = createElement(tag, parent, context);

  const { attributes } = tag;

  const { value } = attributes;

  if (value === '*') {
    parent.isMany = true;

    delete parent.isAttr;
  }

  return element;
}

function parseXMI(tag, parent, context) {
  const { attributes } = tag;

  context.prefix = Object.keys(attributes).reduce((prefix, key) => {
    if (key.startsWith('xmlns:')) {
      if (key.endsWith('cmof')) {
        return 'cmof';
      } else if (key.endsWith('uml')) {
        return 'uml';
      }
    }

    return prefix;
  }, null);
}

function replacePrefixWithNamespace(string, context) {
  const { prefixNamespaces } = context;

  if (!prefixNamespaces) {
    return string;
  }

  const split = string.split(/#|::/);

  if (split.length > 1) {
    split[ 0 ] = prefixNamespaces[ split[ 0 ] ] || split[ 0 ];
  }

  return split.join(':');
}