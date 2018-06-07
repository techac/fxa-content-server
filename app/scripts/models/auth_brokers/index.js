/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * This module is not itself an auth broker, instead it encapsulates
 * the decision about which auth broker to instantiate. Essentially
 * it maps context strings to auth broker constructors.
 */

import Constants from '../../lib/constants';

const AUTH_BROKERS = {
  /* eslint-disable sorting/sort-object-props */
  [Constants.FX_SYNC_CONTEXT]: 'fx-sync',
  [Constants.FX_DESKTOP_V1_CONTEXT]: 'fx-desktop-v1',
  [Constants.FX_DESKTOP_V2_CONTEXT]: 'fx-desktop-v2',
  [Constants.FX_DESKTOP_V3_CONTEXT]: 'fx-desktop-v3',
  [Constants.FX_FENNEC_V1_CONTEXT]: 'fx-fennec-v1',
  [Constants.FX_FIRSTRUN_V1_CONTEXT]: 'fx-firstrun-v1',
  [Constants.FX_FIRSTRUN_V2_CONTEXT]: 'fx-firstrun-v2',
  [Constants.FX_IOS_V1_CONTEXT]: 'fx-ios-v1',
  [Constants.MOBILE_ANDROID_V1_CONTEXT]: 'mob-android-v1',
  [Constants.MOBILE_IOS_V1_CONTEXT]: 'mob-ios-v1',
  [Constants.OAUTH_CONTEXT]: 'oauth-redirect',
  [Constants.OAUTH_CHROME_ANDROID_CONTEXT]: 'oauth-redirect-chrome-android',
  [Constants.CONTENT_SERVER_CONTEXT]: 'web',
  /* eslint-enable sorting/sort-object-props */
};

module.exports = {
  /**
   * Return the appropriate auth broker constructor for the given context.
   *
   * @param {String} context
   * @returns {Promise} resolves to broker
   */
  get (context) {
    const path = AUTH_BROKERS[context] || AUTH_BROKERS[Constants.CONTENT_SERVER_CONTEXT];
    return import(`../auth_brokers/${path}`).then(result => {
      // dynamic imports do not return the `default` property
      // by default, rather they return the top level module with a `default` property.
      if (result.default) {
        return result.default;
      }
      return result;
    });
  }
};
