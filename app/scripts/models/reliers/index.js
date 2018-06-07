/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * This module is not itself relier, instead it encapsulates
 * the decision about which relier to instantiate.
 */

const RELIERS = {
  /* eslint-disable sorting/sort-object-props */
  'base': 'relier',
  'oauth': 'oauth',
  'sync': 'sync'
  /* eslint-enable sorting/sort-object-props */
};

module.exports = {
  /**
   * Return the appropriate relier
   *
   * @param {String} relier
   * @returns {Promise} resolves to the Relier
   */
  get (relier) {
    const path = RELIERS[relier] || RELIERS['base'];
    return import(`./${path}`).then(result => {
      // dynamic imports do not return the `default` property
      // by default, rather they return the top level module with a `default` property.
      if (result.default) {
        return result.default;
      }
      return result;
    });
  }
};
