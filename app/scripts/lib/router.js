/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */


const _ = require('underscore');
const Backbone = require('backbone');
const IndexView = require('../views/index');
const OAuthIndexView = require('../views/oauth_index');
const RedirectAuthView = require('../views/authorization');
const Storage = require('./storage');
const VerificationReasons = require('./verification-reasons');

function createViewHandler(ViewOrPath, options) {
  return function () {
    return getView(ViewOrPath).then((View) => {
      return this.showView(View, options);
    });
  };
}

function createChildViewHandler(ChildViewOrPath, ParentViewOrPath, options) {
  return function () {
    return Promise.all([
      getView(ChildViewOrPath),
      getView(ParentViewOrPath)
    ]).then(([ ChildView, ParentView ]) => {
      return this.showChildView(ChildView, ParentView, options);
    });
  };
}

function getView(ViewOrPath) {
  if (typeof ViewOrPath === 'string') {
    return import(`../views/${ViewOrPath}`)
      .then((result) => {
        if (result.default) {
          return result.default;
        }
        return result;
      });
  } else {
    return Promise.resolve(ViewOrPath);
  }
}

function createViewModel(data) {
  return new Backbone.Model(data || {});
}

const Router = Backbone.Router.extend({
  routes: {
    '(/)': createViewHandler(IndexView),
    'authorization(/)': createViewHandler(RedirectAuthView),
    'cannot_create_account(/)': createViewHandler('cannot_create_account'),
    'choose_what_to_sync(/)': createViewHandler('choose_what_to_sync'),
    'clear(/)': createViewHandler('clear_storage'),
    'complete_reset_password(/)': createViewHandler('complete_reset_password'),
    'complete_signin(/)': createViewHandler('complete_sign_up', { type: VerificationReasons.SIGN_IN }),
    'confirm(/)': createViewHandler('confirm', { type: VerificationReasons.SIGN_UP }),
    'confirm_reset_password(/)': createViewHandler('confirm_reset_password'),
    'confirm_signin(/)': createViewHandler('confirm', { type: VerificationReasons.SIGN_IN }),
    'connect_another_device(/)': createViewHandler('connect_another_device'),
    'connect_another_device/why(/)': createChildViewHandler('why_connect_another_device', 'connect_another_device'),
    'cookies_disabled(/)': createViewHandler('cookies_disabled'),
    'force_auth(/)': createViewHandler('force_auth'),
    'legal(/)': createViewHandler('legal'),
    'legal/privacy(/)': createViewHandler('pp'),
    'legal/terms(/)': createViewHandler('tos'),
    'oauth(/)': createViewHandler(OAuthIndexView),
    'oauth/force_auth(/)': createViewHandler('force_auth'),
    'oauth/signin(/)': 'onSignIn',
    'oauth/signup(/)': 'onSignUp',
    'primary_email_verified(/)': createViewHandler('ready', { type: VerificationReasons.PRIMARY_EMAIL_VERIFIED }),
    'report_signin(/)': createViewHandler('report_sign_in'),
    'reset_password(/)': createViewHandler('reset_password'),
    'reset_password_confirmed(/)': createViewHandler('ready', { type: VerificationReasons.PASSWORD_RESET }),
    'reset_password_verified(/)': createViewHandler('ready', { type: VerificationReasons.PASSWORD_RESET }),
    'secondary_email_verified(/)': createViewHandler('ready', { type: VerificationReasons.SECONDARY_EMAIL_VERIFIED }),
    'settings(/)': createViewHandler('settings'),
    'settings/avatar/camera(/)': createChildViewHandler('settings/avatar_camera', 'settings'),
    'settings/avatar/change(/)': createChildViewHandler('settings/avatar_change', 'settings'),
    'settings/avatar/crop(/)': createChildViewHandler('settings/avatar_crop', 'settings'),
    'settings/change_password(/)': createChildViewHandler('settings/change_password', 'settings'),
    'settings/clients(/)': createChildViewHandler('settings/clients', 'settings'),
    'settings/clients/disconnect(/)': createChildViewHandler('settings/client_disconnect', 'settings'),
    'settings/communication_preferences(/)': createChildViewHandler('settings/communication_preferences', 'settings'),
    'settings/delete_account(/)': createChildViewHandler('settings/delete_account', 'settings'),
    'settings/display_name(/)': createChildViewHandler('settings/display_name', 'settings'),
    'settings/emails(/)': createChildViewHandler('settings/emails', 'settings'),
    'settings/two_step_authentication(/)': createChildViewHandler('settings/two_step_authentication', 'settings'),
    'settings/two_step_authentication/recovery_codes(/)': createChildViewHandler('settings/recovery_codes', 'settings'),
    'signin(/)': 'onSignIn',
    'signin_bounced(/)': createViewHandler('sign_in_bounced'),
    'signin_confirmed(/)': createViewHandler('ready', { type: VerificationReasons.SIGN_IN }),
    'signin_permissions(/)': createViewHandler('permissions', { type: VerificationReasons.SIGN_IN }),
    'signin_recovery_code(/)': createViewHandler('sign_in_recovery_code'),
    'signin_reported(/)': createViewHandler('sign_in_reported'),
    'signin_token_code(/)': createViewHandler('sign_in_token_code'),
    'signin_totp_code(/)': createViewHandler('sign_in_totp_code'),
    'signin_unblock(/)': createViewHandler('sign_in_unblock'),
    'signin_verified(/)': createViewHandler('ready', { type: VerificationReasons.SIGN_IN }),
    'signup(/)': 'onSignUp',
    'signup_confirmed(/)': createViewHandler('ready', { type: VerificationReasons.SIGN_UP }),
    'signup_permissions(/)': createViewHandler('permissions', { type: VerificationReasons.SIGN_UP }),
    'signup_verified(/)': createViewHandler('ready', { type: VerificationReasons.SIGN_UP }),
    'sms(/)': createViewHandler('sms_send'),
    'sms/sent(/)': createViewHandler('sms_sent'),
    'sms/why(/)': createChildViewHandler('why_connect_another_device', 'sms_send'),
    'verify_email(/)': createViewHandler('complete_sign_up', { type: VerificationReasons.SIGN_UP }),
    'verify_primary_email(/)': createViewHandler('complete_sign_up', { type: VerificationReasons.PRIMARY_EMAIL_VERIFIED }),
    'verify_secondary_email(/)': createViewHandler('complete_sign_up', { type: VerificationReasons.SECONDARY_EMAIL_VERIFIED })
  },

  initialize (options = {}) {
    this.metrics = options.metrics;
    this.notifier = options.notifier;
    this.relier = options.relier;
    this.user = options.user;
    this.window = options.window || window;
    this._viewModelStack = [];

    this.notifier.once('view-shown', this._afterFirstViewHasRendered.bind(this));
    this.notifier.on('navigate', this.onNavigate.bind(this));
    this.notifier.on('navigate-back', this.onNavigateBack.bind(this));
    this.notifier.on('email-first-flow', () => this._onEmailFirstFlow());

    this.storage = Storage.factory('sessionStorage', this.window);
  },

  onSignUp () {
    const viewPath = this._isEmailFirstFlow ? 'sign_up_password' : 'sign_up';
    return getView(viewPath).then(View => this.showView(View));
  },

  onSignIn () {
    const viewPath = this._isEmailFirstFlow ? 'sign_in_password' : 'sign_in';
    return getView(viewPath).then(View => this.showView(View));
  },

  onNavigate (event) {
    if (event.server) {
      return this.navigateAway(event.url);
    }

    this.navigate(event.url, event.nextViewData, event.routerOptions);
  },

  onNavigateBack (event) {
    this.navigateBack(event.nextViewData);
  },

  /**
   * Navigate to `url` using `nextViewData` as the data for the view's model.
   *
   * @param {String} url
   * @param {Object} [nextViewData={}]
   * @param {Object} [options={}]
   *   @param {Boolean} [options.clearQueryParams=false] Clear the query parameters?
   *   @param {Boolean} [options.replace=false] Replace the current view?
   *   @param {Boolean} [options.trigger=true] Show the new view?
   * @returns {any}
   */
  navigate (url, nextViewData = {}, options = {}) {
    if (options.replace && this._viewModelStack.length) {
      this._viewModelStack[this._viewModelStack.length - 1] = createViewModel(nextViewData);
    } else {
      this._viewModelStack.push(createViewModel(nextViewData));
    }

    if (! options.hasOwnProperty('trigger')) {
      options.trigger = true;
    }

    // If the caller has not asked us to clear the query params
    // and the new URL does not contain query params, propagate
    // the current query params to the next view.
    if (! options.clearQueryParams && ! /\?/.test(url)) {
      url = url + this.window.location.search;
    }

    return Backbone.Router.prototype.navigate.call(this, url, options);
  },

  /**
   * Navigate externally to the application, flushing the metrics
   * before doing so.
   *
   * @param {String} url
   * @returns {Promise}
   */
  navigateAway (url) {
    return this.metrics.flush()
      .then(() => {
        this.window.location.href = url;
      });
  },

  /**
   * Go back one URL, combining the previous view's viewModel
   * with the data in `previousViewData`.
   *
   * @param {Object} [previousViewData={}]
   */
  navigateBack (previousViewData = {}) {
    if (this.canGoBack()) {
      // ditch the current view's model, go back to the previous view's model.
      this._viewModelStack.pop();
      const viewModel = this.getCurrentViewModel();
      if (viewModel) {
        viewModel.set(previousViewData);
      }
      this.window.history.back();
    }
  },

  /**
   * Get the current viewModel, if one is available.
   *
   * @returns {Object}
   */
  getCurrentViewModel () {
    if (this._viewModelStack.length) {
      return this._viewModelStack[this._viewModelStack.length - 1];
    }
  },

  /**
   * Get the options to pass to a View constructor.
   *
   * @param {Object} options - additional options
   * @returns {Object}
   */
  getViewOptions (options) {
    // passed in options block can override
    // default options.
    return _.extend({
      canGoBack: this.canGoBack(),
      currentPage: this.getCurrentPage(),
      model: this.getCurrentViewModel(),
      viewName: this.getCurrentViewName()
    }, options);
  },

  /**
   * Is it possible to go back?
   *
   * @returns {Boolean}
   */
  canGoBack () {
    return !! this.storage.get('canGoBack');
  },

  /**
   * Get the pathname of the current page.
   *
   * @returns {String}
   */
  getCurrentPage () {
    const fragment = Backbone.history.fragment || '';
    // strip leading /
    return fragment.replace(/^\//, '')
      // strip trailing /
      .replace(/\/$/, '')
      // we only want the pathname
      .replace(/\?.*/, '');
  },

  getCurrentViewName () {
    return this.fragmentToViewName(this.getCurrentPage());
  },

  _afterFirstViewHasRendered () {
    // back is enabled after the first view is rendered or
    // if the user re-starts the app.
    this.storage.set('canGoBack', true);
  },

  _onEmailFirstFlow () {
    this._isEmailFirstFlow = true;

    // back is enabled for email-first so that
    // users can go back to the / screen from "Mistyped email".
    // The initial navigation to the next screen
    // happens before the / page is rendered, causing
    // `canGoBack` to not be set.
    this.storage.set('canGoBack', true);
  },

  fragmentToViewName (fragment) {
    fragment = fragment || '';
    // strip leading /
    return fragment.replace(/^\//, '')
      // strip trailing /
      .replace(/\/$/, '')
      // any other slashes get converted to '.'
      .replace(/\//g, '.')
      // search params can contain sensitive info
      .replace(/\?.*/, '')
      // replace _ with -
      .replace(/_/g, '-');
  },

  /**
   * Notify the system a new View should be shown.
   *
   * @param {Function} View - view constructor
   * @param {Object} [options]
   */
  showView (View, options) {
    this.notifier.trigger(
      'show-view', View, this.getViewOptions(options));
  },

  /**
   * Notify the system a new ChildView should be shown.
   *
   * @param {Function} ChildView - view constructor
   * @param {Function} ParentView - view constructor,
   *     the parent of the ChildView
   * @param {Object} [options]
   */
  showChildView (ChildView, ParentView, options) {
    this.notifier.trigger(
      'show-child-view', ChildView, ParentView, this.getViewOptions(options));
  },

  /**
   * Create a route handler that is used to display a View
   *
   * @param {Function} View - constructor of view to show
   * @param {Object} [options] - options to pass to View constructor
   * @returns {Function} - a function that can be given to the router.
   */
  createViewHandler: createViewHandler,

  /**
   * Create a route handler that is used to display a ChildView inside of
   * a ParentView. Views will be created as needed.
   *
   * @param {Function} ChildView - constructor of ChildView to show
   * @param {Function} ParentView - constructor of ParentView to show
   * @param {Object} [options] - options to pass to ChildView &
   *     ParentView constructors
   * @returns {Function} - a function that can be given to the router.
   */
  createChildViewHandler: createChildViewHandler
});

module.exports = Router;
