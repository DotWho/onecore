const Util = (($, $$) => {

    function toType(obj) {
        return {}.toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase()
    }

    function isElement(obj) {
        return (obj[0] || obj).nodeType
    }

    // Public Util Api
    const Util = {

        getEvent(e1) {
            const isMobile = window.navigator.userAgent.match(/Mobile/)
                          && window.navigator.userAgent.match(/Mobile/)[0] === 'Mobile'
            return isMobile ? 'touchstart' : e1
        },

        typeCheckConfig(componentName, config, configTypes) {
            for (const property in configTypes) {
                if (configTypes.hasOwnProperty(property)) {
                    const expectedTypes = configTypes[property]
                    const value = config[property]
                    const valueType = value && isElement(value) ?
                        'element' : toType(value)

                    if (!new RegExp(expectedTypes).test(valueType)) {
                        throw new Error(
                            `${componentName.toUpperCase()}: ` +
                            `Option "${property}" provided type "${valueType}" ` +
                            `but expected type "${expectedTypes}".`)
                    }
                }
            }
        }
    }

    return Util

})(Bliss, Bliss.$)

export default Util
