
class BadNomadMIError extends Error {

}

class Schema {

  constructor() {
    this.category = 'category'
    this.section = 'section'
    this.property = 'property'
    this.value = 'value'
    this.reference = 'reference'
    this.pkg = 'package'

    this.isCategory = (element) => element.mType === this.category
    this.isFeature = (element) => element.mType === this.section || this.isProperty(element)
    this.isSection = (element) => element.mType === this.section
    this.isReference = (element) => element.mType === this.reference
    this.isValue = (element) => element.mType === this.value
    this.isProperty = (element) => this.isValue(element) || this.isReference(element)
    this.isDefinition = (element) => this.isCategory(element) || this.isFeature(element)
    this.isPakage = (element) => element.mType === this.pkg
    this.isElement = (element) => this.isPakage(element) || this.isDefinition(element)
  }

  allContents(element, func) {
    if (this.isPakage(element)) {
      (element.definitions || []).forEach(element => this.allContents(element, func))
    }
    func(element)
  }
}

export const schema = new Schema()

class Repository {
  constructor() {
    this.contents = []
    this.names = {}
  }

  add(dict) {
    dict = this.addNomadMiJson(dict.metadict_name, dict)
    this.resolveAll()
    this.resolveSuperNames()
    this.addReverseRefs()
    return dict
  }

  createProxy(reference) {
    return {
      mIsProxy: true,
      mReference: reference
    }
  }

  resolve(proxy) {
    if (proxy.mIsProxy) {
      const resolved = this.names[proxy.mReference]
      return resolved || proxy
    } else {
      return proxy
    }
  }

  resolveSuperNames() {
    this.allContents(element => {
      if (element._superNames) {
        element._superNames.forEach(parentOrSuper => {
          if (schema.isSection(parentOrSuper)) {
            if (schema.isFeature(element)) {
              if (element.parent) {
                throw new BadNomadMIError(`More than one parent in feature ${element.name}`)
              }
              element.parent = parentOrSuper
            } else {
              if (element.section) {
                throw new BadNomadMIError(`More than one section for category ${element.name}`)
              }
              element.section = parentOrSuper
            }
          } else if (schema.isCategory(parentOrSuper)) {
            if (schema.isCategory(element)) {
              element.super = element.super || []
              element.super.push(parentOrSuper)
            } else if (schema.isFeature(element)) {
              element.categories = element.categories || []
              element.categories.push(parentOrSuper)
            } else {
              throw new BadNomadMIError(`Non feature ${element.name} references category ${parentOrSuper.name}.`)
            }
          } else if (schema.isProperty(parentOrSuper)) {
            this.warnings.push(`SuperName in ${element.name} references property ${parentOrSuper.name}. That is not allowed ?!`)
          } else {
            throw new BadNomadMIError(`Referenced parent or super ${parentOrSuper.name} is not a section or category (in ${element.name})`)
          }
        })
      }
    })
  }

  resolveAll() {
    this.allContents(element => {
      if (element._superNames) {
        element._superNames = element._superNames.map((ref) => {
          const resolved = this.resolve(ref)
          if (resolved.mIsProxy) {
            element.problems.push(`Could not resolve parent section ${ref.mReference} in ${element.name}.`)
          }
          return resolved
        })
      }
      if (element.referencedSection) {
        const ref = element.referencedSection
        const resolved = this.resolve(ref)
        if (resolved.mIsProxy) {
          element.problems.push(`Could not resolve referenced section ${ref.mReference} in ${element.name}.`)
        }
        element.referencedSection = resolved
      }
    })
  }

  addReverseRefs() {
    this.allContents(definition => {
      if (definition.parent) {
        definition.parent.features = definition.parent.features || []
        if (schema.isCategory(definition)) {
          console.log('?')
        }
        definition.parent.features.push(definition)
      }
      if (schema.isPakage(definition)) {
        definition.definitions.forEach(feature => {
          feature.package = definition
        })
      }
    })
  }

  allContents(func) {
    this.contents.forEach(element => schema.allContents(element, func))
  }

  addName(namedElement) {
    const {name} = namedElement
    if (this.names[name]) {
      throw new BadNomadMIError(`Element with name ${namedElement.name} does already exist.`)
    }
    this.names[name] = namedElement
  }

  addNomadMiJson(name, json) {
    const transformMetaInfo = (metaInfo) => {
      const isSection = metaInfo.meta_type === 'type-section'
      const isCategory = metaInfo.meta_type === 'type-abstract'
      const isValue = metaInfo.meta_type === 'type-value' || metaInfo.meta_type === 'type-dimension'
      const isReference = metaInfo.meta_type === 'type-reference'
      const isProperty = isValue || isReference

      const superNames = metaInfo.meta_parent_section ? [metaInfo.meta_parent_section] : []
      const definition = {
        name: metaInfo.meta_name,
        description: metaInfo.meta_description,
        miJson: metaInfo,
        problems: [],
        _superNames: superNames.map(ref => this.createProxy(ref))
      }
      if (isSection) {
        definition.mType = schema.section
        definition.features = []
      } else if (isCategory) {
        definition.mType = schema.category
      } else if (isValue) {
        definition.mType = schema.value
      } else if (isReference) {
        definition.mType = schema.reference
        if (!metaInfo.referencedSections || metaInfo.referencedSections.length < 1) {
          definition.problems.push(`Reference ${definition.name} does not reference anything.`)
        } else {
          definition.referencedSection = this.createProxy(metaInfo.referencedSections[0])
        }
      } else {
        throw new BadNomadMIError(`Cannot determine mType of feature ${name}:${metaInfo.name}`)
      }

      this.addName(definition)
      return definition
    }

    const metaInfos = json.meta_info_entry || []
    const dependencies = json.dependencies || []
    const pkg = {
      mType: schema.pkg,
      name: name,
      description: json.metadict_description,
      definitions: metaInfos.map(transformMetaInfo)
    }

    this.addName(pkg)

    dependencies.forEach(dep => {
      // TODO
    })

    this.contents.push(pkg)
    return pkg
  }
}

export const repository = new Repository()
