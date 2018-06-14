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
const valueToJsonSchema = (definition) => {
  const dimensions = definition.miJson.meta_dimension
  if (dimensions) {
    return ({
      title: definition.name,
      description: definition.description,
      type: 'array',
      items: {
        type: definition.miJson.meta_data_type
      }
    })
  } else {
    return ({
      title: definition.name,
      description: definition.description,
      type: definition.miJson.meta_data_type
    })
  }
}

const sectionToJsonSchema = (definition) => ({
    type: "object",
    title: definition.name,
    description: definition.description,
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
  "type": "object",
  "title": dict.name,
  "description": dict.description,
  "properties": dict.definitions
    .filter(schema.isSection)
    .map(definitionToJsonSchema)
    .toObject()
}

console.log(JSON.stringify(jsonSchema, null, 2))
