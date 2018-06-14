import { repository, schema } from './repository'
import optimade from '../schema/optimade.nomadmetainfo.json'

const dict = repository.add(optimade)

const definitionToJsonSchema = (definition) => {
  if (schema.isSection(definition)) {
    return sectionToJsonSchema(definition)
  } else if (schema.isValue(definition)) {
    return valueToJsonSchema(definition)
  } else {
    return {
      title: definition.name
    }
  }
}
const dataTypeToJsonSchema = (type) => {
  if (type === 'int') {
    return 'integer'
  } else {
    return type
  }
}

const valueToJsonSchema = (definition) => {
  const dimensions = definition.miJson.meta_dimension
  let {description} = definition
  if (Array.isArray(description)) {
    description = description.join(" ")
  }
  if (dimensions) {
    return ({
      title: definition.name,
      description: description,
      type: 'array',
      items: {
        type: dataTypeToJsonSchema(definition.miJson.meta_data_type)
      }
    })
  } else {
    return ({
      title: definition.name,
      description: description,
      type: dataTypeToJsonSchema(definition.miJson.meta_data_type)
    })
  }
}

const sectionToJsonSchema = (definition) => ({
    type: "object",
    title: definition.name,
    description: definition.description.join(" "),
    properties: definition.features
      .map(definitionToJsonSchema)
      .toObject(),
    required: definition.features
      .filter(feature => feature.miJson.meta_required)
      .map(feature => feature.name)
  })

Array.prototype.toObject = function() {
  const obj = {}
  this.forEach(item => {
    const key = item.title
    item.title = undefined
    obj[key] = item
  })
  return obj
}

const jsonSchema = {
  "$schema": "http://json-schema.org/draft-06/schema#",
  "definitions": dict.definitions
    .filter(schema.isSection)
    .map(definitionToJsonSchema)
    .toObject()
}

var fs = require('fs')
fs.writeFile("optimade-schema.json", JSON.stringify(jsonSchema, null, 2), function(err) {
    if(err) {
        return console.log(err)
    }
    console.log(JSON.stringify(jsonSchema, null, 2))
});


