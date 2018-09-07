/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Notifies the user that their sign-in confirmation email bounced.
 */
import BaseView from './base';
import Cocktail from 'cocktail';
import FlowEventsMixin from './mixins/flow-events-mixin';
import Session from '../lib/session';
import Template from 'templates/sign_in_bounced.mustache';

const { preventDefaultThen } = BaseView;

const SignInBouncedView = BaseView.extend({
  events: {
    'click #create-account': preventDefaultThen('_createAccount'),
    'click a[href="/signin"]': preventDefaultThen('_signIn')
  },

  template: Template,

  initialize (options) {
    this._formPrefill = options.formPrefill;
  },

  beforeRender () {
    if (! this.model.has('email')) {
      // This may occur if the user has refreshed the page. In that case,
      // we have no context for properly rendering the view, so kick them
      // out to / where they can start again.
      this.navigate('/');
    }
  },

  setInitialContext (context) {
    context.set({
      email: this.model.get('email'),
      escapedSupportLinkAttrs: 'id="support" href="https://support.mozilla.org/" target="_blank" data-flow-event="link.support"'
    });
  },

  _createAccount () {
    this.user.removeAllAccounts();
    Session.clear();
    this._formPrefill.clear();
    this.navigate('signup');
  },

  _signIn () {
    this.navigate('/', {
      bouncedEmail: this.model.get('email')
    });
  }
});

Cocktail.mixin(
  SignInBouncedView,
  FlowEventsMixin
);

module.exports = SignInBouncedView;

