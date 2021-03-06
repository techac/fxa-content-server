/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

const BaseGroupingRule = require('./base');
const Constants = require('../../../lib/constants');
const GROUPS_DEFAULT = ['control', 'treatment-code', 'treatment-link'];

const ROLLOUT_CLIENTS = {
  '37fdfa37698f251a': {
    enableTestEmails: false,
    groups: GROUPS_DEFAULT,
    name: 'Lockbox Extension',
    rolloutRate: 0.0
  },
  '98adfa37698f255b': {
    enableTestEmails: true,
    groups: ['treatment-code'],
    name: 'Lockbox Extension iOS',
    rolloutRate: 0.0,
  },
  'ecdb5ae7add825d4': {
    enableTestEmails: false,
    groups: GROUPS_DEFAULT,
    name: 'TestClient',
    rolloutRate: 0.0
  }
};

module.exports = class TokenCodeGroupingRule extends BaseGroupingRule {
  constructor() {
    super();
    this.name = 'tokenCode';
    this.SYNC_ROLLOUT_RATE = 0.00;
    this.ROLLOUT_CLIENTS = ROLLOUT_CLIENTS;
  }

  choose(subject) {
    if (! subject || ! subject.uniqueUserId || ! subject.experimentGroupingRules || ! subject.isTokenCodeSupported || ! subject.account) {
      return false;
    }

    if (subject.clientId) {
      const client = this.ROLLOUT_CLIENTS[subject.clientId];

      if (client) {
        const groups = client.groups || GROUPS_DEFAULT;

        // Check if this client supports test emails
        if (client.enableTestEmails && this.isTestEmail(subject.account.get('email'))) {
          return this.uniformChoice(groups, subject.uniqueUserId);
        }

        if (this.bernoulliTrial(client.rolloutRate, subject.uniqueUserId)) {
          return this.uniformChoice(groups, subject.uniqueUserId);
        }
      }

      // If a clientId was specified but not defined in the rollout configuration, the default
      // is to disable the experiment for them.
      return false;
    }

    if (subject.service && subject.service === Constants.SYNC_SERVICE) {
      if (this.bernoulliTrial(this.SYNC_ROLLOUT_RATE, subject.uniqueUserId)) {
        return this.uniformChoice(GROUPS_DEFAULT, subject.uniqueUserId);
      }
    }

    return false;
  }
};
