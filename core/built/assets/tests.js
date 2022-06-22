'use strict';

define("ghost-admin/tests/acceptance/authentication-test", ["ghost-admin/utils/window-proxy", "miragejs", "mocha", "ember-simple-auth/test-support", "@ember/test-helpers", "chai", "ember-mocha", "ember-cli-mirage/test-support"], function (_windowProxy, _miragejs, _mocha, _testSupport, _testHelpers, _chai, _emberMocha, _testSupport2) {
  "use strict";

  (0, _mocha.describe)('Acceptance: Authentication', function () {
    let originalReplaceLocation;
    let hooks = (0, _emberMocha.setupApplicationTest)();
    (0, _testSupport2.setupMirage)(hooks);
    (0, _mocha.describe)('setup redirect', function () {
      (0, _mocha.beforeEach)(function () {
        // ensure the /users/me route doesn't error
        this.server.create('user');
        this.server.get('authentication/setup', function () {
          return {
            setup: [{
              status: false
            }]
          };
        });
      });
      (0, _mocha.it)('redirects to setup when setup isn\'t complete', async function () {
        await (0, _testHelpers.visit)('settings/labs');
        (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/setup');
      });
    });
    (0, _mocha.describe)('general page', function () {
      let newLocation;
      (0, _mocha.beforeEach)(function () {
        originalReplaceLocation = _windowProxy.default.replaceLocation;

        _windowProxy.default.replaceLocation = function (url) {
          url = url.replace(/^\/ghost\//, '/');
          newLocation = url;
        };

        newLocation = undefined;
        let role = this.server.create('role', {
          name: 'Administrator'
        });
        this.server.create('user', {
          roles: [role],
          slug: 'test-user'
        });
      });
      (0, _mocha.afterEach)(function () {
        _windowProxy.default.replaceLocation = originalReplaceLocation;
      });
      (0, _mocha.it)('invalidates session on 401 API response', async function () {
        // return a 401 when attempting to retrieve users
        this.server.get('/users/', () => new _miragejs.Response(401, {}, {
          errors: [{
            message: 'Access denied.',
            type: 'UnauthorizedError'
          }]
        }));
        await (0, _testSupport.authenticateSession)();
        await (0, _testHelpers.visit)('/settings/staff'); // running `visit(url)` inside windowProxy.replaceLocation breaks
        // the async behaviour so we need to run `visit` here to simulate
        // the browser visiting the new page

        if (newLocation) {
          await (0, _testHelpers.visit)(newLocation);
        }

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'url after 401').to.equal('/signin');
      });
      (0, _mocha.it)('doesn\'t show navigation menu on invalid url when not authenticated', async function () {
        await (0, _testSupport.invalidateSession)();
        await (0, _testHelpers.visit)('/');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'current url').to.equal('/signin');
        (0, _chai.expect)((0, _testHelpers.findAll)('nav.gh-nav').length, 'nav menu presence').to.equal(0);
        await (0, _testHelpers.visit)('/signin/invalidurl/');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'url after invalid url').to.equal('/signin/invalidurl/');
        (0, _chai.expect)((0, _testHelpers.currentRouteName)(), 'path after invalid url').to.equal('error404');
        (0, _chai.expect)((0, _testHelpers.findAll)('nav.gh-nav').length, 'nav menu presence').to.equal(0);
      });
      (0, _mocha.it)('shows nav menu on invalid url when authenticated', async function () {
        await (0, _testSupport.authenticateSession)();
        await (0, _testHelpers.visit)('/signin/invalidurl/');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'url after invalid url').to.equal('/signin/invalidurl/');
        (0, _chai.expect)((0, _testHelpers.currentRouteName)(), 'path after invalid url').to.equal('error404');
        (0, _chai.expect)((0, _testHelpers.findAll)('nav.gh-nav').length, 'nav menu presence').to.equal(1);
      });
    }); // TODO: re-enable once modal reappears correctly

    _mocha.describe.skip('editor', function () {
      let origDebounce = Ember.run.debounce;
      let origThrottle = Ember.run.throttle; // we don't want the autosave interfering in this test

      (0, _mocha.beforeEach)(function () {
        Ember.run.debounce = function () {};

        Ember.run.throttle = function () {};
      });
      (0, _mocha.it)('displays re-auth modal attempting to save with invalid session', async function () {
        let role = this.server.create('role', {
          name: 'Administrator'
        });
        this.server.create('user', {
          roles: [role]
        }); // simulate an invalid session when saving the edited post

        this.server.put('/posts/:id/', function (_ref, _ref2) {
          let {
            posts
          } = _ref;
          let {
            params
          } = _ref2;
          let post = posts.find(params.id);
          let attrs = this.normalizedRequestAttrs();

          if (attrs.mobiledoc.cards[0][1].markdown === 'Edited post body') {
            return new _miragejs.Response(401, {}, {
              errors: [{
                message: 'Access denied.',
                type: 'UnauthorizedError'
              }]
            });
          } else {
            return post.update(attrs);
          }
        });
        await (0, _testSupport.authenticateSession)();
        await (0, _testHelpers.visit)('/editor'); // create the post

        await (0, _testHelpers.fillIn)('#entry-title', 'Test Post');
        await (0, _testHelpers.fillIn)('.__mobiledoc-editor', 'Test post body');
        await (0, _testHelpers.click)('.js-publish-button'); // we shouldn't have a modal at this point

        (0, _chai.expect)((0, _testHelpers.findAll)('.modal-container #login').length, 'modal exists').to.equal(0); // we also shouldn't have any alerts

        (0, _chai.expect)((0, _testHelpers.findAll)('.gh-alert').length, 'no of alerts').to.equal(0); // update the post

        await (0, _testHelpers.fillIn)('.__mobiledoc-editor', 'Edited post body');
        await (0, _testHelpers.click)('.js-publish-button'); // we should see a re-auth modal

        (0, _chai.expect)((0, _testHelpers.findAll)('.fullscreen-modal #login').length, 'modal exists').to.equal(1);
      }); // don't clobber debounce/throttle for future tests

      (0, _mocha.afterEach)(function () {
        Ember.run.debounce = origDebounce;
        Ember.run.throttle = origThrottle;
      });
    });
  });
});
define("ghost-admin/tests/acceptance/content-test", ["ember-simple-auth/test-support", "mocha", "@ember/test-helpers", "ember-power-select/test-support/helpers", "chai", "ember-mocha", "ember-cli-mirage/test-support"], function (_testSupport, _mocha, _testHelpers, _helpers, _chai, _emberMocha, _testSupport2) {
  "use strict";

  (0, _mocha.describe)('Acceptance: Content', function () {
    let hooks = (0, _emberMocha.setupApplicationTest)();
    (0, _testSupport2.setupMirage)(hooks);
    (0, _mocha.it)('redirects to signin when not authenticated', async function () {
      await (0, _testSupport.invalidateSession)();
      await (0, _testHelpers.visit)('/posts');
      (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/signin');
    });
    (0, _mocha.describe)('as admin', function () {
      let admin, editor, publishedPost, scheduledPost, draftPost, authorPost;
      (0, _mocha.beforeEach)(async function () {
        let adminRole = this.server.create('role', {
          name: 'Administrator'
        });
        admin = this.server.create('user', {
          roles: [adminRole]
        });
        let editorRole = this.server.create('role', {
          name: 'Editor'
        });
        editor = this.server.create('user', {
          roles: [editorRole]
        });
        publishedPost = this.server.create('post', {
          authors: [admin],
          status: 'published',
          title: 'Published Post'
        });
        scheduledPost = this.server.create('post', {
          authors: [admin],
          status: 'scheduled',
          title: 'Scheduled Post'
        });
        draftPost = this.server.create('post', {
          authors: [admin],
          status: 'draft',
          title: 'Draft Post'
        });
        authorPost = this.server.create('post', {
          authors: [editor],
          status: 'published',
          title: 'Editor Published Post'
        }); // pages shouldn't appear in the list

        this.server.create('page', {
          authors: [admin],
          status: 'published',
          title: 'Published Page'
        });
        return await (0, _testSupport.authenticateSession)();
      });

      _mocha.it.skip('displays and filters posts', async function () {
        await (0, _testHelpers.visit)('/posts'); // Not checking request here as it won't be the last request made
        // Displays all posts + pages

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-post-id]').length, 'all posts count').to.equal(4); // show draft posts

        await (0, _helpers.selectChoose)('[data-test-type-select]', 'Draft posts'); // API request is correct

        let [lastRequest] = this.server.pretender.handledRequests.slice(-1);
        (0, _chai.expect)(lastRequest.queryParams.filter, '"drafts" request status filter').to.have.string('status:draft'); // Displays draft post

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-post-id]').length, 'drafts count').to.equal(1);
        (0, _chai.expect)((0, _testHelpers.find)(`[data-test-post-id="${draftPost.id}"]`), 'draft post').to.exist; // show published posts

        await (0, _helpers.selectChoose)('[data-test-type-select]', 'Published posts'); // API request is correct

        [lastRequest] = this.server.pretender.handledRequests.slice(-1);
        (0, _chai.expect)(lastRequest.queryParams.filter, '"published" request status filter').to.have.string('status:published'); // Displays three published posts + pages

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-post-id]').length, 'published count').to.equal(2);
        (0, _chai.expect)((0, _testHelpers.find)(`[data-test-post-id="${publishedPost.id}"]`), 'admin published post').to.exist;
        (0, _chai.expect)((0, _testHelpers.find)(`[data-test-post-id="${authorPost.id}"]`), 'author published post').to.exist; // show scheduled posts

        await (0, _helpers.selectChoose)('[data-test-type-select]', 'Scheduled posts'); // API request is correct

        [lastRequest] = this.server.pretender.handledRequests.slice(-1);
        (0, _chai.expect)(lastRequest.queryParams.filter, '"scheduled" request status filter').to.have.string('status:scheduled'); // Displays scheduled post

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-post-id]').length, 'scheduled count').to.equal(1);
        (0, _chai.expect)((0, _testHelpers.find)(`[data-test-post-id="${scheduledPost.id}"]`), 'scheduled post').to.exist; // show all posts

        await (0, _helpers.selectChoose)('[data-test-type-select]', 'All posts'); // API request is correct

        [lastRequest] = this.server.pretender.handledRequests.slice(-1);
        (0, _chai.expect)(lastRequest.queryParams.filter, '"all" request status filter').to.have.string('status:[draft,scheduled,published]'); // show all posts by editor

        await (0, _helpers.selectChoose)('[data-test-author-select]', editor.name); // API request is correct

        [lastRequest] = this.server.pretender.handledRequests.slice(-1);
        (0, _chai.expect)(lastRequest.queryParams.filter, '"editor" request status filter').to.have.string('status:[draft,scheduled,published]');
        (0, _chai.expect)(lastRequest.queryParams.filter, '"editor" request filter param').to.have.string(`authors:${editor.slug}`); // Post status is only visible when members is enabled

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-visibility-select]'), 'access dropdown before members enabled').to.not.exist;
        let featureService = this.owner.lookup('service:feature');
        featureService.set('members', true);
        await (0, _testHelpers.settled)();
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-visibility-select]'), 'access dropdown after members enabled').to.exist;
        await (0, _helpers.selectChoose)('[data-test-visibility-select]', 'Paid members-only');
        [lastRequest] = this.server.pretender.handledRequests.slice(-1);
        (0, _chai.expect)(lastRequest.queryParams.filter, '"visibility" request filter param').to.have.string('visibility:paid+status:[draft,scheduled,published]'); // Displays editor post
        // TODO: implement "filter" param support and fix mirage post->author association
        // expect(find('[data-test-post-id]').length, 'editor post count').to.equal(1);
        // expect(find(`[data-test-post-id="${authorPost.id}"]`), 'author post').to.exist;
        // TODO: test tags dropdown
      }); // TODO: skipped due to consistently random failures on Travis
      // options[0] is undefined
      // https://github.com/TryGhost/Ghost/issues/10308


      _mocha.it.skip('sorts tags filter alphabetically', async function () {
        this.server.create('tag', {
          name: 'B - Second',
          slug: 'second'
        });
        this.server.create('tag', {
          name: 'Z - Last',
          slug: 'last'
        });
        this.server.create('tag', {
          name: 'A - First',
          slug: 'first'
        });
        await (0, _testHelpers.visit)('/posts');
        await (0, _helpers.clickTrigger)('[data-test-tag-select]');
        let options = (0, _testHelpers.findAll)('.ember-power-select-option');
        (0, _chai.expect)(options[0].textContent.trim()).to.equal('All tags');
        (0, _chai.expect)(options[1].textContent.trim()).to.equal('A - First');
        (0, _chai.expect)(options[2].textContent.trim()).to.equal('B - Second');
        (0, _chai.expect)(options[3].textContent.trim()).to.equal('Z - Last');
      });

      (0, _mocha.it)('can add and edit custom views', async function () {
        // actions are not visible when there's no filter
        await (0, _testHelpers.visit)('/posts');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="edit-view"]'), 'edit-view button (no filter)').to.not.exist;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="add-view"]'), 'add-view button (no filter)').to.not.exist; // add action is visible after filtering to a non-default filter

        await (0, _helpers.selectChoose)('[data-test-author-select]', admin.name);
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="add-view"]'), 'add-view button (with filter)').to.exist; // adding view shows it in the sidebar

        await (0, _testHelpers.click)('[data-test-button="add-view"]'), 'add-view button';
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="custom-view-form"]'), 'custom view modal (on add)').to.exist;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="custom-view-form"] h1').textContent.trim()).to.equal('New view');
        await (0, _testHelpers.fillIn)('[data-test-input="custom-view-name"]', 'Test view');
        await (0, _testHelpers.click)('[data-test-button="save-custom-view"]'); // modal closes on save

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="custom-view-form"]'), 'custom view modal (after add save)').to.not.exist; // UI updates

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-nav-custom="posts-Test view"]'), 'new view nav').to.exist;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-nav-custom="posts-Test view"]').textContent.trim()).to.equal('Test view');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="add-view"]'), 'add-view button (on existing view)').to.not.exist;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="edit-view"]'), 'edit-view button (on existing view)').to.exist; // editing view

        await (0, _testHelpers.click)('[data-test-button="edit-view"]'), 'edit-view button';
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="custom-view-form"]'), 'custom view modal (on edit)').to.exist;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="custom-view-form"] h1').textContent.trim()).to.equal('Edit view');
        await (0, _testHelpers.fillIn)('[data-test-input="custom-view-name"]', 'Updated view');
        await (0, _testHelpers.click)('[data-test-button="save-custom-view"]'); // modal closes on save

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="custom-view-form"]'), 'custom view modal (after edit save)').to.not.exist; // UI updates

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-nav-custom="posts-Updated view"]')).to.exist;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-nav-custom="posts-Updated view"]').textContent.trim()).to.equal('Updated view');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="add-view"]'), 'add-view button (after edit)').to.not.exist;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="edit-view"]'), 'edit-view button (after edit)').to.exist;
      });
      (0, _mocha.it)('can navigate to custom views', async function () {
        this.server.create('setting', {
          group: 'site',
          key: 'shared_views',
          value: JSON.stringify([{
            route: 'posts',
            name: 'My posts',
            filter: {
              author: admin.slug
            }
          }])
        });
        await (0, _testHelpers.visit)('/posts'); // nav bar contains default + custom views

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-nav-custom="posts-Drafts"]')).to.exist;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-nav-custom="posts-Scheduled"]')).to.exist;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-nav-custom="posts-Published"]')).to.exist;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-nav-custom="posts-My posts"]')).to.exist; // screen has default title and sidebar is showing inactive custom view

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-screen-title]').textContent.trim()).to.equal('Posts');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-nav="posts"]')).to.have.class('active'); // clicking sidebar custom view link works

        await (0, _testHelpers.click)('[data-test-nav-custom="posts-Scheduled"]');
        (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/posts?type=scheduled');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-screen-title]').textContent.trim()).to.match(/Posts[ \n]+Scheduled/);
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-nav-custom="posts-Scheduled"]')).to.have.class('active'); // clicking the main posts link resets

        await (0, _testHelpers.click)('[data-test-nav="posts"]');
        (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/posts');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-screen-title]').textContent.trim()).to.equal('Posts');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-nav-custom="posts-Scheduled"]')).to.not.have.class('active'); // changing a filter to match a custom view shows custom view

        await (0, _helpers.selectChoose)('[data-test-type-select]', 'Scheduled posts');
        (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/posts?type=scheduled');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-nav-custom="posts-Scheduled"]')).to.have.class('active');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-screen-title]').textContent.trim()).to.match(/Posts[ \n]+Scheduled/);
      });
    });
    (0, _mocha.describe)('as author', function () {
      let author, authorPost;
      (0, _mocha.beforeEach)(async function () {
        let authorRole = this.server.create('role', {
          name: 'Author'
        });
        author = this.server.create('user', {
          roles: [authorRole]
        });
        let adminRole = this.server.create('role', {
          name: 'Administrator'
        });
        let admin = this.server.create('user', {
          roles: [adminRole]
        }); // create posts

        authorPost = this.server.create('post', {
          authors: [author],
          status: 'published',
          title: 'Author Post'
        });
        this.server.create('post', {
          authors: [admin],
          status: 'scheduled',
          title: 'Admin Post'
        });
        return await (0, _testSupport.authenticateSession)();
      });
      (0, _mocha.it)('only fetches the author\'s posts', async function () {
        await (0, _testHelpers.visit)('/posts'); // trigger a filter request so we can grab the posts API request easily

        await (0, _helpers.selectChoose)('[data-test-type-select]', 'Published posts'); // API request includes author filter

        let [lastRequest] = this.server.pretender.handledRequests.slice(-1);
        (0, _chai.expect)(lastRequest.queryParams.filter).to.have.string(`authors:${author.slug}`); // only author's post is shown

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-post-id]').length, 'post count').to.equal(1);
        (0, _chai.expect)((0, _testHelpers.find)(`[data-test-post-id="${authorPost.id}"]`), 'author post').to.exist;
      });
    });
    (0, _mocha.describe)('as contributor', function () {
      (0, _mocha.beforeEach)(async function () {
        let adminRole = this.server.create('role', {
          name: 'Administrator'
        });
        let admin = this.server.create('user', {
          roles: [adminRole]
        }); // Create posts

        this.server.create('post', {
          authors: [admin],
          status: 'scheduled',
          title: 'Admin Post'
        });
        return await (0, _testSupport.authenticateSession)();
      });
    });
  });
});
define("ghost-admin/tests/acceptance/custom-post-templates-test", ["ghost-admin/utils/ctrl-or-cmd", "ember-simple-auth/test-support", "mocha", "@ember/test-helpers", "chai", "ember-mocha", "ember-cli-mirage/test-support"], function (_ctrlOrCmd, _testSupport, _mocha, _testHelpers, _chai, _emberMocha, _testSupport2) {
  "use strict";

  // keyCodes
  const KEY_S = 83;
  (0, _mocha.describe)('Acceptance: Custom Post Templates', function () {
    let hooks = (0, _emberMocha.setupApplicationTest)();
    (0, _testSupport2.setupMirage)(hooks);
    (0, _mocha.beforeEach)(async function () {
      this.server.loadFixtures('settings');
      let role = this.server.create('role', {
        name: 'Administrator'
      });
      this.server.create('user', {
        roles: [role]
      });
      return await (0, _testSupport.authenticateSession)();
    });
    (0, _mocha.describe)('with custom templates', function () {
      (0, _mocha.beforeEach)(function () {
        this.server.create('theme', {
          active: true,
          name: 'example-theme',
          package: {
            name: 'Example Theme',
            version: '0.1'
          },
          templates: [{
            filename: 'custom-news-bulletin.hbs',
            name: 'News Bulletin',
            for: ['post', 'page'],
            slug: null
          }, {
            filename: 'custom-big-images.hbs',
            name: 'Big Images',
            for: ['post', 'page'],
            slug: null
          }, {
            filename: 'post-one.hbs',
            name: 'One',
            for: ['post'],
            slug: 'one'
          }, {
            filename: 'page-about.hbs',
            name: 'About',
            for: ['page'],
            slug: 'about'
          }]
        });
      });
      (0, _mocha.it)('can change selected template', async function () {
        let post = this.server.create('post', {
          customTemplate: 'custom-news-bulletin.hbs'
        });
        await (0, _testHelpers.visit)('/editor/post/1');
        await (0, _testHelpers.click)('[data-test-psm-trigger]'); // template form should be shown

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-custom-template-form]')).to.exist; // custom template should be selected

        let select = (0, _testHelpers.find)('[data-test-select="custom-template"]');
        (0, _chai.expect)(select.value, 'selected value').to.equal('custom-news-bulletin.hbs'); // templates list should contain default and custom templates in alphabetical order

        (0, _chai.expect)(select.options.length).to.equal(3);
        (0, _chai.expect)(select.options.item(0).value, 'default value').to.equal('');
        (0, _chai.expect)(select.options.item(0).text, 'default text').to.equal('Default');
        (0, _chai.expect)(select.options.item(1).value, 'first custom value').to.equal('custom-big-images.hbs');
        (0, _chai.expect)(select.options.item(1).text, 'first custom text').to.equal('Big Images');
        (0, _chai.expect)(select.options.item(2).value, 'second custom value').to.equal('custom-news-bulletin.hbs');
        (0, _chai.expect)(select.options.item(2).text, 'second custom text').to.equal('News Bulletin'); // select the default template

        await (0, _testHelpers.fillIn)(select, ''); // save then check server record

        await (0, _testHelpers.triggerKeyEvent)('.gh-app', 'keydown', KEY_S, {
          metaKey: _ctrlOrCmd.default === 'command',
          ctrlKey: _ctrlOrCmd.default === 'ctrl'
        });
        (0, _chai.expect)(this.server.db.posts.find(post.id).customTemplate, 'saved custom template').to.equal('');
      });
      (0, _mocha.it)('disables template selector if slug matches slug-based template');
      (0, _mocha.it)('doesn\'t query themes endpoint unncessarily', async function () {
        // eslint-disable-next-line
        let themeRequests = () => {
          return this.server.pretender.handledRequests.filter(function (request) {
            return request.url.match(/\/themes\//);
          });
        };

        this.server.create('post', {
          customTemplate: 'custom-news-bulletin.hbs'
        });
        await (0, _testHelpers.visit)('/editor/post/1');
        await (0, _testHelpers.click)('[data-test-psm-trigger]');
        (0, _chai.expect)(themeRequests().length, 'after first open').to.equal(1);
        await (0, _testHelpers.click)('[data-test-psm-trigger]'); // hide

        await (0, _testHelpers.click)('[data-test-psm-trigger]'); // show

        (0, _chai.expect)(themeRequests().length, 'after second open').to.equal(1);
      });
    });
    (0, _mocha.describe)('without custom templates', function () {
      (0, _mocha.beforeEach)(function () {
        this.server.create('theme', {
          active: true,
          name: 'example-theme',
          package: {
            name: 'Example Theme',
            version: '0.1'
          },
          templates: []
        });
      });
      (0, _mocha.it)('doesn\'t show template selector', async function () {
        this.server.create('post', {
          customTemplate: 'custom-news-bulletin.hbs'
        });
        await (0, _testHelpers.visit)('/editor/post/1');
        await (0, _testHelpers.click)('[data-test-psm-trigger]'); // template form should be shown

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-custom-template-form]')).to.not.exist;
      });
    });
  });
});
define("ghost-admin/tests/acceptance/dashboard-test", ["ember-simple-auth/test-support", "@ember/test-helpers", "mocha", "chai", "ember-mocha", "ember-cli-mirage/test-support"], function (_testSupport, _testHelpers, _mocha, _chai, _emberMocha, _testSupport2) {
  "use strict";

  (0, _mocha.describe)('Acceptance: Dashboard', function () {
    const hooks = (0, _emberMocha.setupApplicationTest)();
    (0, _testSupport2.setupMirage)(hooks);
    beforeEach(async function () {
      this.server.loadFixtures('configs');
      this.server.loadFixtures('settings');
      let role = this.server.create('role', {
        name: 'Administrator'
      });
      this.server.create('user', {
        roles: [role]
      });
      return await (0, _testSupport.authenticateSession)();
    });
    (0, _mocha.it)('can visit /dashboard', async function () {
      await (0, _testHelpers.visit)('/dashboard');
      (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/dashboard');
    });
    (0, _mocha.it)('/ redirects to /dashboard', async function () {
      await (0, _testHelpers.visit)('/');
      (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/dashboard');
    });
    (0, _mocha.describe)('permissions', function () {
      beforeEach(async function () {
        this.server.db.users.remove();
        await (0, _testSupport.invalidateSession)();
      });
      (0, _mocha.it)('is not accessible when logged out', async function () {
        await (0, _testHelpers.visit)('/dashboard');
        (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/signin');
      });
    });
  });
});
define("ghost-admin/tests/acceptance/editor-test", ["ghost-admin/utils/ctrl-or-cmd", "moment", "sinon", "miragejs", "ember-simple-auth/test-support", "mocha", "@ember/test-helpers", "ember-power-datepicker/test-support", "chai", "ember-power-select/test-support", "ember-mocha", "ember-cli-mirage/test-support", "ghost-admin/tests/helpers/visit"], function (_ctrlOrCmd, _moment, _sinon, _miragejs, _testSupport, _mocha, _testHelpers, _testSupport2, _chai, _testSupport3, _emberMocha, _testSupport4, _visit) {
  "use strict";

  // TODO: update ember-power-datepicker to expose modern test helpers
  // https://github.com/cibernox/ember-power-datepicker/issues/30
  (0, _mocha.describe)('Acceptance: Editor', function () {
    let hooks = (0, _emberMocha.setupApplicationTest)();
    (0, _testSupport4.setupMirage)(hooks);
    (0, _mocha.it)('redirects to signin when not authenticated', async function () {
      let author = this.server.create('user'); // necesary for post-author association

      this.server.create('post', {
        authors: [author]
      });
      await (0, _testSupport.invalidateSession)();
      await (0, _visit.visit)('/editor/post/1');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/signin');
    });
    (0, _mocha.it)('does not redirect to staff page when authenticated as contributor', async function () {
      let role = this.server.create('role', {
        name: 'Contributor'
      });
      let author = this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      this.server.create('post', {
        authors: [author]
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/editor/post/1');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/editor/post/1');
    });
    (0, _mocha.it)('does not redirect to staff page when authenticated as author', async function () {
      let role = this.server.create('role', {
        name: 'Author'
      });
      let author = this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      this.server.create('post', {
        authors: [author]
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/editor/post/1');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/editor/post/1');
    });
    (0, _mocha.it)('does not redirect to staff page when authenticated as editor', async function () {
      let role = this.server.create('role', {
        name: 'Editor'
      });
      let author = this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      this.server.create('post', {
        authors: [author]
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/editor/post/1');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/editor/post/1');
    });
    (0, _mocha.it)('displays 404 when post does not exist', async function () {
      let role = this.server.create('role', {
        name: 'Editor'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/editor/post/1');
      (0, _chai.expect)((0, _testHelpers.currentRouteName)()).to.equal('error404');
      (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/editor/post/1');
    });
    (0, _mocha.it)('when logged in as a contributor, renders a save button instead of a publish menu & hides tags input', async function () {
      let role = this.server.create('role', {
        name: 'Contributor'
      });
      let author = this.server.create('user', {
        roles: [role]
      });
      this.server.createList('post', 2, {
        authors: [author]
      });
      this.server.loadFixtures('settings');
      await (0, _testSupport.authenticateSession)(); // post id 1 is a draft, checking for draft behaviour now

      await (0, _visit.visit)('/editor/post/1');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/editor/post/1'); // Expect publish menu to not exist

      (0, _chai.expect)((0, _testHelpers.find)('[data-test-publishmenu-trigger]'), 'publish menu trigger').to.not.exist; // Open post settings menu

      await (0, _testHelpers.click)('[data-test-psm-trigger]'); // Check to make sure that tags input doesn't exist

      (0, _chai.expect)((0, _testHelpers.find)('[data-test-token-input]'), 'tags input').to.not.exist; // post id 2 is published, we should be redirected to index

      await (0, _visit.visit)('/editor/post/2');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/posts');
    });
    (0, _mocha.describe)('when logged in', function () {
      let author;
      (0, _mocha.beforeEach)(async function () {
        let role = this.server.create('role', {
          name: 'Administrator'
        });
        author = this.server.create('user', {
          roles: [role]
        });
        this.server.loadFixtures('settings');
        return await (0, _testSupport.authenticateSession)();
      });
      (0, _mocha.describe)('post settings menu', function () {
        (0, _mocha.it)('can set publish date', async function () {
          let [post1] = this.server.createList('post', 2, {
            authors: [author]
          });
          let futureTime = (0, _moment.default)().tz('Etc/UTC').add(10, 'minutes'); // sanity check

          (0, _chai.expect)((0, _moment.default)(post1.publishedAt).tz('Etc/UTC').format('YYYY-MM-DD HH:mm:ss'), 'initial publishedAt sanity check').to.equal('2015-12-19 16:25:07'); // post id 1 is a draft, checking for draft behaviour now

          await (0, _visit.visit)('/editor/post/1'); // open post settings menu

          await (0, _testHelpers.click)('[data-test-psm-trigger]'); // should error, if the publish time is in the wrong format

          await (0, _testHelpers.fillIn)('[data-test-date-time-picker-time-input]', 'foo');
          await (0, _testHelpers.blur)('[data-test-date-time-picker-time-input]');
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-time-picker-error]').textContent.trim(), 'inline error response for invalid time').to.equal('Must be in format: "15:00"'); // should error, if the publish time is in the future
          // NOTE: date must be selected first, changing the time first will save
          // with the new time

          await (0, _testHelpers.fillIn)('[data-test-date-time-picker-datepicker] input', _moment.default.tz('Etc/UTC').add(1, 'day').format('YYYY-MM-DD'));
          await (0, _testHelpers.blur)('[data-test-date-time-picker-datepicker] input');
          await (0, _testHelpers.fillIn)('[data-test-date-time-picker-time-input]', futureTime.format('HH:mm'));
          await (0, _testHelpers.blur)('[data-test-date-time-picker-time-input]');
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-time-picker-error]').textContent.trim(), 'inline error response for future time').to.equal('Must be in the past'); // closing the PSM will reset the invalid date/time

          await (0, _testHelpers.click)('[data-test-psm-trigger]');
          await (0, _testHelpers.click)('[data-test-psm-trigger]');
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-time-picker-error]'), 'date picker error after closing PSM').to.not.exist;
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-time-picker-date-input]').value, 'PSM date value after closing with invalid date').to.equal((0, _moment.default)(post1.publishedAt).tz('Etc/UTC').format('YYYY-MM-DD'));
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-time-picker-time-input]').value, 'PSM time value after closing with invalid date').to.equal((0, _moment.default)(post1.publishedAt).tz('Etc/UTC').format('HH:mm')); // saves the post with the new date

          let validTime = (0, _moment.default)('2017-04-09 12:00');
          await (0, _testHelpers.fillIn)('[data-test-date-time-picker-time-input]', validTime.format('HH:mm'));
          await (0, _testHelpers.blur)('[data-test-date-time-picker-time-input]');
          await (0, _testSupport2.datepickerSelect)('[data-test-date-time-picker-datepicker]', validTime.toDate());
          (0, _chai.expect)((0, _moment.default)(post1.publishedAt).tz('Etc/UTC').format('YYYY-MM-DD HH:mm:ss')).to.equal('2017-04-09 12:00:00'); // go to settings to change the timezone

          await (0, _visit.visit)('/settings/general');
          await (0, _testHelpers.click)('[data-test-toggle-timezone]');
          (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL for settings').to.equal('/settings/general');
          (0, _chai.expect)((0, _testHelpers.find)('#timezone option:checked').textContent.trim(), 'default timezone').to.equal('(GMT) UTC'); // select a new timezone

          (0, _testHelpers.find)('#timezone option[value="Pacific/Kwajalein"]').selected = true;
          await (0, _testHelpers.triggerEvent)('#timezone', 'change'); // save the settings

          await (0, _testHelpers.click)('[data-test-button="save"]');
          (0, _chai.expect)((0, _testHelpers.find)('#timezone option:checked').textContent.trim(), 'new timezone after saving').to.equal('(GMT +12:00) International Date Line West'); // and now go back to the editor

          await (0, _visit.visit)('/editor/post/1');
          await (0, _testHelpers.click)('[data-test-psm-trigger]');
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-time-picker-date-input]').value, 'date after timezone change').to.equal('2017-04-10');
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-time-picker-time-input]').value, 'time after timezone change').to.equal('00:00');
        });
      });

      _mocha.it.skip('handles validation errors when scheduling', async function () {
        this.server.put('/posts/:id/', function () {
          return new _miragejs.Response(422, {}, {
            errors: [{
              type: 'ValidationError',
              message: 'Error test'
            }]
          });
        });
        let post = this.server.create('post', 1, {
          authors: [author],
          status: 'draft'
        });
        let plusTenMin = (0, _moment.default)().utc().add(10, 'minutes');
        await (0, _visit.visit)(`/editor/post/${post.id}`);
        await (0, _testHelpers.click)('[data-test-publishmenu-trigger]');
        await (0, _testHelpers.click)('[data-test-publishmenu-scheduled-option]');
        await (0, _testSupport2.datepickerSelect)('[data-test-publishmenu-draft] [data-test-date-time-picker-datepicker]', plusTenMin.toDate());
        await (0, _testHelpers.fillIn)('[data-test-publishmenu-draft] [data-test-date-time-picker-time-input]', plusTenMin.format('HH:mm'));
        await (0, _testHelpers.blur)('[data-test-publishmenu-draft] [data-test-date-time-picker-time-input]');
        await (0, _testHelpers.click)('[data-test-publishmenu-save]');
        (0, _chai.expect)((0, _testHelpers.findAll)('.gh-alert').length, 'number of alerts after failed schedule').to.equal(1);
        (0, _chai.expect)((0, _testHelpers.find)('.gh-alert').textContent, 'alert text after failed schedule').to.match(/Error test/);
      });

      _mocha.it.skip('handles title validation errors correctly', async function () {
        this.server.create('post', {
          authors: [author]
        }); // post id 1 is a draft, checking for draft behaviour now

        await (0, _visit.visit)('/editor/post/1');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/editor/post/1');
        await (0, _testHelpers.fillIn)('[data-test-editor-title-input]', Array(260).join('a'));
        await (0, _testHelpers.click)('[data-test-publishmenu-trigger]');
        await (0, _testHelpers.click)('[data-test-publishmenu-save]');
        (0, _chai.expect)((0, _testHelpers.findAll)('.gh-alert').length, 'number of alerts after invalid title').to.equal(1);
        (0, _chai.expect)((0, _testHelpers.find)('.gh-alert').textContent, 'alert text after invalid title').to.match(/Title cannot be longer than 255 characters/);
      }); // NOTE: these tests are specific to the mobiledoc editor
      // it('inserts a placeholder if the title is blank', async function () {
      //     this.server.createList('post', 1);
      //
      //     // post id 1 is a draft, checking for draft behaviour now
      //     await visit('/editor/post/1');
      //
      //     expect(currentURL(), 'currentURL')
      //         .to.equal('/editor/post/1');
      //
      //     await titleRendered();
      //
      //     let title = find('#koenig-title-input div');
      //     expect(title.data('placeholder')).to.equal('Your Post Title');
      //     expect(title.hasClass('no-content')).to.be.false;
      //
      //     await replaceTitleHTML('');
      //     expect(title.hasClass('no-content')).to.be.true;
      //
      //     await replaceTitleHTML('test');
      //     expect(title.hasClass('no-content')).to.be.false;
      // });
      //
      // it('removes HTML from the title.', async function () {
      //     this.server.createList('post', 1);
      //
      //     // post id 1 is a draft, checking for draft behaviour now
      //     await visit('/editor/post/1');
      //
      //     expect(currentURL(), 'currentURL')
      //         .to.equal('/editor/post/1');
      //
      //     await titleRendered();
      //
      //     let title = find('#koenig-title-input div');
      //     await replaceTitleHTML('<div>TITLE&nbsp;&#09;&nbsp;&thinsp;&ensp;&emsp;TEST</div>&nbsp;');
      //     expect(title.html()).to.equal('TITLE      TEST ');
      // });


      (0, _mocha.it)('renders first countdown notification before scheduled time', async function () {
        let clock = _sinon.default.useFakeTimers((0, _moment.default)().valueOf());

        let compareDate = (0, _moment.default)().tz('Etc/UTC').add(4, 'minutes');
        let compareDateString = compareDate.format('YYYY-MM-DD');
        let compareTimeString = compareDate.format('HH:mm');
        this.server.create('post', {
          publishedAt: _moment.default.utc().add(4, 'minutes'),
          status: 'scheduled',
          authors: [author]
        });
        this.server.create('setting', {
          timezone: 'Europe/Dublin'
        });
        clock.restore();
        await (0, _visit.visit)('/editor/post/1');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/editor/post/1');
        await (0, _testHelpers.click)('[data-test-psm-trigger]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-time-picker-date-input]').value, 'scheduled date').to.equal(compareDateString);
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-time-picker-time-input]').value, 'scheduled time').to.equal(compareTimeString); // expect countdown to show warning, that post is scheduled to be published

        await (0, _testHelpers.triggerEvent)('[data-test-editor-post-status]', 'mouseover');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-schedule-countdown]').textContent.trim(), 'notification countdown').to.match(/to be published\s+in (4|5) minutes/);
      });
      (0, _mocha.it)('shows author token input and allows changing of authors in PSM', async function () {
        let adminRole = this.server.create('role', {
          name: 'Adminstrator'
        });
        let authorRole = this.server.create('role', {
          name: 'Author'
        });
        let user1 = this.server.create('user', {
          name: 'Primary',
          roles: [adminRole]
        });
        this.server.create('user', {
          name: 'Waldo',
          roles: [authorRole]
        });
        this.server.create('post', {
          authors: [user1]
        });
        await (0, _visit.visit)('/editor/post/1');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/editor/post/1');
        await (0, _testHelpers.click)('[data-test-psm-trigger]');
        let tokens = (0, _testHelpers.findAll)('[data-test-input="authors"] .ember-power-select-multiple-option');
        (0, _chai.expect)(tokens.length).to.equal(1);
        (0, _chai.expect)(tokens[0].textContent.trim()).to.have.string('Primary');
        await (0, _testSupport3.selectChoose)('[data-test-input="authors"]', 'Waldo');
        let savedAuthors = this.server.schema.posts.find('1').authors.models;
        (0, _chai.expect)(savedAuthors.length).to.equal(2);
        (0, _chai.expect)(savedAuthors[0].name).to.equal('Primary');
        (0, _chai.expect)(savedAuthors[1].name).to.equal('Waldo');
      });
      (0, _mocha.it)('saves post settings fields', async function () {
        let post = this.server.create('post', {
          authors: [author]
        });
        await (0, _visit.visit)(`/editor/post/${post.id}`); // TODO: implement tests for other fields

        await (0, _testHelpers.click)('[data-test-psm-trigger]'); // excerpt has validation

        await (0, _testHelpers.fillIn)('[data-test-field="custom-excerpt"]', Array(302).join('a'));
        await (0, _testHelpers.blur)('[data-test-field="custom-excerpt"]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="custom-excerpt"]').textContent.trim(), 'excerpt too long error').to.match(/cannot be longer than 300/);
        (0, _chai.expect)(this.server.db.posts.find(post.id).customExcerpt, 'saved excerpt after validation error').to.be.null; // changing custom excerpt auto-saves

        await (0, _testHelpers.fillIn)('[data-test-field="custom-excerpt"]', 'Testing excerpt');
        await (0, _testHelpers.blur)('[data-test-field="custom-excerpt"]');
        (0, _chai.expect)(this.server.db.posts.find(post.id).customExcerpt, 'saved excerpt').to.equal('Testing excerpt'); // -------
        // open code injection subview

        await (0, _testHelpers.click)('[data-test-button="codeinjection"]'); // header injection has validation

        let headerCM = (0, _testHelpers.find)('[data-test-field="codeinjection-head"] .CodeMirror').CodeMirror;
        await headerCM.setValue(Array(65540).join('a'));
        await (0, _testHelpers.click)(headerCM.getInputField());
        await (0, _testHelpers.blur)(headerCM.getInputField());
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="codeinjection-head"]').textContent.trim(), 'header injection too long error').to.match(/cannot be longer than 65535/);
        (0, _chai.expect)(this.server.db.posts.find(post.id).codeinjectionHead, 'saved header injection after validation error').to.be.null; // changing header injection auto-saves

        await headerCM.setValue('<script src="http://example.com/inject-head.js"></script>');
        await (0, _testHelpers.click)(headerCM.getInputField());
        await (0, _testHelpers.blur)(headerCM.getInputField());
        (0, _chai.expect)(this.server.db.posts.find(post.id).codeinjectionHead, 'saved header injection').to.equal('<script src="http://example.com/inject-head.js"></script>'); // footer injection has validation

        let footerCM = (0, _testHelpers.find)('[data-test-field="codeinjection-foot"] .CodeMirror').CodeMirror;
        await footerCM.setValue(Array(65540).join('a'));
        await (0, _testHelpers.click)(footerCM.getInputField());
        await (0, _testHelpers.blur)(footerCM.getInputField());
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="codeinjection-foot"]').textContent.trim(), 'footer injection too long error').to.match(/cannot be longer than 65535/);
        (0, _chai.expect)(this.server.db.posts.find(post.id).codeinjectionFoot, 'saved footer injection after validation error').to.be.null; // changing footer injection auto-saves

        await footerCM.setValue('<script src="http://example.com/inject-foot.js"></script>');
        await (0, _testHelpers.click)(footerCM.getInputField());
        await (0, _testHelpers.blur)(footerCM.getInputField());
        (0, _chai.expect)(this.server.db.posts.find(post.id).codeinjectionFoot, 'saved footer injection').to.equal('<script src="http://example.com/inject-foot.js"></script>'); // closing subview switches back to main PSM view

        await (0, _testHelpers.click)('[data-test-button="close-psm-subview"]');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-field="codeinjection-head"]').length, 'header injection not present after closing subview').to.equal(0); // -------
        // open twitter data subview

        await (0, _testHelpers.click)('[data-test-button="twitter-data"]'); // twitter title has validation

        await (0, _testHelpers.click)('[data-test-field="twitter-title"]');
        await (0, _testHelpers.fillIn)('[data-test-field="twitter-title"]', Array(302).join('a'));
        await (0, _testHelpers.blur)('[data-test-field="twitter-title"]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="twitter-title"]').textContent.trim(), 'twitter title too long error').to.match(/cannot be longer than 300/);
        (0, _chai.expect)(this.server.db.posts.find(post.id).twitterTitle, 'saved twitter title after validation error').to.be.null; // changing twitter title auto-saves
        // twitter title has validation

        await (0, _testHelpers.click)('[data-test-field="twitter-title"]');
        await (0, _testHelpers.fillIn)('[data-test-field="twitter-title"]', 'Test Twitter Title');
        await (0, _testHelpers.blur)('[data-test-field="twitter-title"]');
        (0, _chai.expect)(this.server.db.posts.find(post.id).twitterTitle, 'saved twitter title').to.equal('Test Twitter Title'); // twitter description has validation

        await (0, _testHelpers.click)('[data-test-field="twitter-description"]');
        await (0, _testHelpers.fillIn)('[data-test-field="twitter-description"]', Array(505).join('a'));
        await (0, _testHelpers.blur)('[data-test-field="twitter-description"]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="twitter-description"]').textContent.trim(), 'twitter description too long error').to.match(/cannot be longer than 500/);
        (0, _chai.expect)(this.server.db.posts.find(post.id).twitterDescription, 'saved twitter description after validation error').to.be.null; // changing twitter description auto-saves
        // twitter description has validation

        await (0, _testHelpers.click)('[data-test-field="twitter-description"]');
        await (0, _testHelpers.fillIn)('[data-test-field="twitter-description"]', 'Test Twitter Description');
        await (0, _testHelpers.blur)('[data-test-field="twitter-description"]');
        (0, _chai.expect)(this.server.db.posts.find(post.id).twitterDescription, 'saved twitter description').to.equal('Test Twitter Description'); // closing subview switches back to main PSM view

        await (0, _testHelpers.click)('[data-test-button="close-psm-subview"]');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-field="twitter-title"]').length, 'twitter title not present after closing subview').to.equal(0); // -------
        // open facebook data subview

        await (0, _testHelpers.click)('[data-test-button="facebook-data"]'); // facebook title has validation

        await (0, _testHelpers.click)('[data-test-field="og-title"]');
        await (0, _testHelpers.fillIn)('[data-test-field="og-title"]', Array(302).join('a'));
        await (0, _testHelpers.blur)('[data-test-field="og-title"]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="og-title"]').textContent.trim(), 'facebook title too long error').to.match(/cannot be longer than 300/);
        (0, _chai.expect)(this.server.db.posts.find(post.id).ogTitle, 'saved facebook title after validation error').to.be.null; // changing facebook title auto-saves
        // facebook title has validation

        await (0, _testHelpers.click)('[data-test-field="og-title"]');
        await (0, _testHelpers.fillIn)('[data-test-field="og-title"]', 'Test Facebook Title');
        await (0, _testHelpers.blur)('[data-test-field="og-title"]');
        (0, _chai.expect)(this.server.db.posts.find(post.id).ogTitle, 'saved facebook title').to.equal('Test Facebook Title'); // facebook description has validation

        await (0, _testHelpers.click)('[data-test-field="og-description"]');
        await (0, _testHelpers.fillIn)('[data-test-field="og-description"]', Array(505).join('a'));
        await (0, _testHelpers.blur)('[data-test-field="og-description"]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="og-description"]').textContent.trim(), 'facebook description too long error').to.match(/cannot be longer than 500/);
        (0, _chai.expect)(this.server.db.posts.find(post.id).ogDescription, 'saved facebook description after validation error').to.be.null; // changing facebook description auto-saves
        // facebook description has validation

        await (0, _testHelpers.click)('[data-test-field="og-description"]');
        await (0, _testHelpers.fillIn)('[data-test-field="og-description"]', 'Test Facebook Description');
        await (0, _testHelpers.blur)('[data-test-field="og-description"]');
        (0, _chai.expect)(this.server.db.posts.find(post.id).ogDescription, 'saved facebook description').to.equal('Test Facebook Description'); // closing subview switches back to main PSM view

        await (0, _testHelpers.click)('[data-test-button="close-psm-subview"]');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-field="og-title"]').length, 'facebook title not present after closing subview').to.equal(0);
      }); // https://github.com/TryGhost/Ghost/issues/11786

      (0, _mocha.it)('save shortcut works when tags/authors field is focused', async function () {
        let post = this.server.create('post', {
          authors: [author]
        });
        await (0, _visit.visit)(`/editor/post/${post.id}`);
        await (0, _testHelpers.fillIn)('[data-test-editor-title-input]', 'CMD-S Test');
        await (0, _testHelpers.click)('[data-test-psm-trigger]');
        await (0, _testHelpers.click)('[data-test-token-input]');
        await (0, _testHelpers.triggerEvent)('[data-test-token-input]', 'keydown', {
          keyCode: 83,
          // s
          metaKey: _ctrlOrCmd.default === 'command',
          ctrlKey: _ctrlOrCmd.default === 'ctrl'
        }); // Check if save request has been sent correctly.

        let [lastRequest] = this.server.pretender.handledRequests.slice(-1);
        let body = JSON.parse(lastRequest.requestBody);
        (0, _chai.expect)(body.posts[0].title).to.equal('CMD-S Test');
      });
    });
  });
});
define("ghost-admin/tests/acceptance/editor/publish-flow-test", ["ghost-admin/tests/helpers/login-as-role", "moment", "@ember/test-helpers", "ember-power-select/test-support/helpers", "ghost-admin/tests/helpers/mailgun", "ghost-admin/tests/helpers/members", "ghost-admin/tests/helpers/newsletters", "ghost-admin/tests/helpers/stripe", "chai", "ember-mocha", "ember-cli-mirage/test-support", "ghost-admin/tests/helpers/visit"], function (_loginAsRole, _moment, _testHelpers, _helpers, _mailgun, _members, _newsletters, _stripe, _chai, _emberMocha, _testSupport, _visit) {
  "use strict";

  describe('Acceptance: Publish flow', function () {
    let hooks = (0, _emberMocha.setupApplicationTest)();
    (0, _testSupport.setupMirage)(hooks);
    beforeEach(function () {
      this.server.loadFixtures();
    });
    it('has minimal features for contributors', async function () {
      await (0, _loginAsRole.default)('Contributor', this.server);
      const post = this.server.create('post', {
        status: 'draft'
      });
      await (0, _visit.visit)(`/editor/post/${post.id}`);
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="publish-flow"]'), 'publish button').to.not.exist;
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="contributor-preview"]'), 'contributor preview button').to.exist;
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="contributor-save"]'), 'contributor save button').to.exist;
      await (0, _testHelpers.fillIn)('[data-test-editor-title-input]', 'Contributor save test');
      await (0, _testHelpers.click)('[data-test-button="contributor-save"]');
      (0, _chai.expect)(post.title, 'post title after save').to.equal('Contributor save test');
    });
    it('triggers post validation before opening', async function () {
      await (0, _loginAsRole.default)('Administrator', this.server);
      const post = this.server.create('post', {
        status: 'draft'
      });
      await (0, _visit.visit)(`/editor/post/${post.id}`);
      await (0, _testHelpers.fillIn)('[data-test-editor-title-input]', Array(260).join('a'));
      await (0, _testHelpers.blur)('[data-test-editor-title-input]');
      await (0, _testHelpers.click)('[data-test-button="publish-flow"]');
      (0, _chai.expect)((0, _testHelpers.find)('.gh-alert'), 'validation shown in alert').to.exist;
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="publish-flow"]'), 'publish flow modal').to.not.exist;
    });
    it('handles timezones correctly when scheduling'); // email unavailable state occurs when
    // 1. members signup access is set to "none"
    // 2. default newsletter recipients is set to "disabled"

    async function testEmailUnavailableFlow() {
      await (0, _loginAsRole.default)('Administrator', this.server);
      const post = this.server.create('post', {
        status: 'draft'
      });
      await (0, _visit.visit)(`/editor/post/${post.id}`);
      await (0, _testHelpers.fillIn)('[data-test-editor-title-input]', 'Members disabled publish test');
      await (0, _testHelpers.blur)('[data-test-editor-title-input]');
      await (0, _testHelpers.click)('[data-test-button="publish-flow"]');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="publish-flow"]'), 'publish flow modal').to.exist;
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-publish-flow="options"]'), 'options step').to.exist; // members/newsletters disabled =
      // - fixed "Publish on site" publish type
      // - no email options shown
      // - standard publish time options

      (0, _chai.expect)((0, _testHelpers.find)('[data-test-setting="publish-type"]'), 'publish type setting').to.exist;
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-setting="publish-type"] [data-test-setting-title]'), 'publish type title').to.contain.trimmed.text('Publish on site');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-setting="publish-type"] [data-test-setting-title]')).to.not.match('button');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-setting="email-recipients"]')).to.not.exist;
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-setting="publish-at"]'), 'publish time setting').to.exist;
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-setting="publish-at"] [data-test-setting-title]'), 'publish time title').to.contain.trimmed.text('Right now');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-setting="publish-at"] [data-test-setting-title]')).to.match('button');
      await (0, _testHelpers.click)('[data-test-button="continue"]');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-publish-flow="confirm"]'), 'confirm step').to.exist;
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-text="confirm-details"]'), 'confirmation text').to.have.rendered.text('Your post will be published on your site.');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="confirm-publish"]'), 'publish button text').to.have.rendered.text('Publish post, right now');
      await (0, _testHelpers.click)('[data-test-button="confirm-publish"]');
      (0, _chai.expect)(post.status, 'post status after publish').to.equal('published');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-publish-flow="complete"]'), 'complete step').to.exist;
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-complete-title]'), 'complete title').to.have.rendered.text('Boom. It’s out there. That’s 1 post published, keep going!');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-complete-bookmark]'), 'bookmark card').to.exist; // "revert to draft" only shown for scheduled posts

      (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="revert-to-draft"]'), 'revert-to-draft button').to.not.exist; // publish/preview buttons are hidden on complete step

      (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="publish-flow-preview"]'), 'preview button on complete step').to.not.exist;
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="publish-flow-publish"]'), 'publish button on complete step').to.not.exist;
      await (0, _testHelpers.click)('[data-test-button="back-to-editor"]');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="publish-flow"]'), 'publish button after publishing').to.not.exist;
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="update-flow"]'), 'update button after publishing').to.exist;
      await (0, _testHelpers.click)('[data-test-button="update-flow"]');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="update-flow"]'), 'update flow modal').to.exist;
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-update-flow-title]')).to.have.rendered.text('This post has been published');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-update-flow-confirmation]')).to.contain.rendered.text('Your post was published on your site');
      const savedPublishAt = (0, _moment.default)(post.publishedAt).utc();
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-update-flow-confirmation]')).to.contain.rendered.text(`on ${savedPublishAt.format('D MMM YYYY')} at ${savedPublishAt.format('HH:mm')}`);
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="revert-to-draft"]')).to.exist;
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="revert-to-draft"]')).to.contain.rendered.text('Unpublish and revert to private draft');
      await (0, _testHelpers.click)('[data-test-button="revert-to-draft"]');
      (0, _chai.expect)(post.status).to.equal('draft');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="update-flow"]')).to.not.exist;
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="publish-flow"]')).to.exist;
    }

    it('can publish with members disabled', async function () {
      await (0, _members.disableMembers)(this.server);
      await testEmailUnavailableFlow.apply(this);
    });
    it('can publish with newsletters disabled', async function () {
      await (0, _members.enableMembers)(this.server);
      await (0, _newsletters.disableNewsletters)(this.server);
      await testEmailUnavailableFlow.apply(this);
    });
    describe('members enabled', function () {
      beforeEach(async function () {
        (0, _members.enableMembers)(this.server);
        (0, _mailgun.enableMailgun)(this.server);
        (0, _newsletters.enableNewsletters)(this.server);
        (0, _stripe.enableStripe)(this.server); // at least one member is required for publish+send to be available

        this.server.createList('member', 3, {
          status: 'free'
        });
        this.server.createList('member', 4, {
          status: 'paid'
        });
        await (0, _loginAsRole.default)('Administrator', this.server);
      });
      it('can publish+send with single newsletter', async function () {
        const post = this.server.create('post', {
          status: 'draft'
        });
        await (0, _visit.visit)(`/editor/post/${post.id}`);
        await (0, _testHelpers.click)('[data-test-button="publish-flow"]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-setting="publish-type"] [data-test-setting-title]'), 'publish type title').to.have.trimmed.rendered.text('Publish and email'); // newsletter is not mentioned in the recipients title

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-setting="email-recipients"] [data-test-setting-title]'), 'publish type title').to.have.trimmed.rendered.text('All 7 subscribers'); // newsletter select shouldn't exist

        await (0, _testHelpers.click)('[data-test-setting="email-recipients"] [data-test-setting-title]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-select="newsletter"]'), 'newsletter select').to.not.exist;
        await (0, _testHelpers.click)('[data-test-button="continue"]'); // confirm text is correct

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-text="confirm-details"]')).to.contain.rendered.text('will be published on your site, and delivered to all 7 subscribers.');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="confirm-publish"]')).to.have.rendered.text('Publish & send, right now');
        await (0, _testHelpers.click)('[data-test-button="confirm-publish"]'); // complete text has right count

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-complete-title]')).to.contain.rendered.text('That’s 1 post published');
      });
      it('can publish+send with multiple newsletters', async function () {
        const newsletter = this.server.create('newsletter', {
          name: 'Second newsletter',
          slug: 'second-newsletter',
          status: 'active',
          subscribeOnSignup: true
        });
        this.server.create('newsletter', {
          name: 'Archived newsletter',
          slug: 'archived-newsletter',
          status: 'archived',
          subscribeOnSignup: true
        });
        this.server.create('member', {
          newsletters: [newsletter],
          status: 'free'
        });
        const post = this.server.create('post', {
          status: 'draft'
        });
        await (0, _visit.visit)(`/editor/post/${post.id}`);
        await (0, _testHelpers.click)('[data-test-button="publish-flow"]'); // newsletter is mentioned in the recipients title

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-setting="email-recipients"] [data-test-setting-title]'), 'publish type title').to.have.trimmed.rendered.text('All 8 subscribers of Default newsletter'); // newsletter select should exist with all active newsletters listed

        await (0, _testHelpers.click)('[data-test-setting="email-recipients"] [data-test-setting-title]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-select="newsletter"]'), 'newsletter select').to.exist;
        await (0, _helpers.clickTrigger)('[data-test-select="newsletter"]');
        (0, _chai.expect)((0, _testHelpers.findAll)('.ember-power-select-dropdown [data-test-select-option]').length).to.equal(2); // selecting a different newsletter updates recipient count

        await (0, _helpers.selectChoose)('[data-test-select="newsletter"]', 'Second newsletter');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-setting="email-recipients"] [data-test-setting-title]'), 'publish type title').to.have.trimmed.rendered.text('1 subscriber of Second newsletter');
        await (0, _testHelpers.click)('[data-test-button="continue"]'); // confirm text is correct

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-text="confirm-details"]')).to.contain.rendered.text('will be published on your site, and delivered to all 1 subscriber of Second newsletter.');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="confirm-publish"]')).to.have.rendered.text('Publish & send, right now');
        await (0, _testHelpers.click)('[data-test-button="confirm-publish"]'); // saved with correct newsletter id

        (0, _chai.expect)(post.newsletterId).to.equal(newsletter.id);
      });
      it('can schedule publish+send', async function () {
        const post = this.server.create('post', {
          status: 'draft'
        });
        await (0, _visit.visit)(`/editor/post/${post.id}`);
        await (0, _testHelpers.click)('[data-test-button="publish-flow"]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-setting="publish-at"] [data-test-setting-title]')).to.have.rendered.text('Right now');
        const siteTz = this.server.db.settings.findBy({
          key: 'timezone'
        }).value;
        const plus5 = (0, _moment.default)().tz(siteTz).add(5, 'minutes').set({});
        await (0, _testHelpers.click)('[data-test-setting="publish-at"] [data-test-setting-title]');
        await (0, _testHelpers.click)('[data-test-radio="schedule"]'); // date + time inputs are shown, defaults to now+5 mins

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-setting="publish-at"] [data-test-date-time-picker-datepicker]'), 'datepicker').to.exist;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-setting="publish-at"] [data-test-date-time-picker-date-input]'), 'initial datepicker value').to.have.value(plus5.format('YYYY-MM-DD'));
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-setting="publish-at"] [data-test-date-time-picker-time-input]'), 'time input').to.exist;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-setting="publish-at"] [data-test-date-time-picker-time-input]'), 'initial time input value').to.have.value(plus5.format('HH:mm')); // can set a new date and time

        const newDate = (0, _moment.default)().tz(siteTz).add(4, 'days').add(5, 'hours').set('second', 0);
        await (0, _testHelpers.fillIn)('[data-test-setting="publish-at"] [data-test-date-time-picker-date-input]', newDate.format('YYYY-MM-DD'));
        await (0, _testHelpers.blur)('[data-test-setting="publish-at"] [data-test-date-time-picker-date-input]');
        await (0, _testHelpers.fillIn)('[data-test-setting="publish-at"] [data-test-date-time-picker-time-input]', newDate.format('HH:mm'));
        await (0, _testHelpers.blur)('[data-test-setting="publish-at"] [data-test-date-time-picker-time-input]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-setting="publish-at"] [data-test-date-time-picker-time-input]')).to.have.value(newDate.format('HH:mm'));
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-setting="publish-at"] [data-test-setting-title]'), 'publish-at title after change').to.have.rendered.text('In 4 days');
        await (0, _testHelpers.click)('[data-test-button="continue"]'); // has correct confirm text

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-text="confirm-details"]')).to.have.rendered.text(`On ${newDate.format('D MMM YYYY')} at ${newDate.format('HH:mm')} your post will be published on your site, and delivered to all 7 subscribers.`);
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="confirm-publish"]')).to.have.rendered.text(`Publish & send, on ${newDate.format('MMMM Do')}`);
        await (0, _testHelpers.click)('[data-test-button="confirm-publish"]'); // saved with correct details

        (0, _chai.expect)(post.status).to.equal('scheduled');
        (0, _chai.expect)(_moment.default.utc(post.publishedAt).format('YYYY-MM-DD HH:mm')).to.equal((0, _moment.default)(newDate).utc().format('YYYY-MM-DD HH:mm'));
        (0, _chai.expect)(post.newsletterId).to.equal('1');
      });
      it('can send', async function () {
        const post = this.server.create('post', {
          status: 'draft'
        });
        await (0, _visit.visit)(`/editor/post/${post.id}`);
        await (0, _testHelpers.click)('[data-test-button="publish-flow"]');
        await (0, _testHelpers.click)('[data-test-setting="publish-type"] [data-test-setting-title]');
        await (0, _testHelpers.click)('[data-test-publish-type="send"]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-setting="publish-type"] [data-test-setting-title]')).to.have.rendered.text('Email');
        await (0, _testHelpers.click)('[data-test-button="continue"]'); // has correct confirm text

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-text="confirm-details"]')).to.have.rendered.text(`Your post will be delivered to all 7 subscribers, and will not be published on your site.`);
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="confirm-publish"]')).to.have.rendered.text(`Send email, right now`);
        await (0, _testHelpers.click)('[data-test-button="confirm-publish"]');
        (0, _chai.expect)(post.attrs.emailOnly).to.be.true;
      });
      it('can schedule send', async function () {
        const post = this.server.create('post', {
          status: 'draft'
        });
        await (0, _visit.visit)(`/editor/post/${post.id}`);
        await (0, _testHelpers.click)('[data-test-button="publish-flow"]');
        await (0, _testHelpers.click)('[data-test-setting="publish-type"] [data-test-setting-title]');
        await (0, _testHelpers.click)('[data-test-publish-type="send"]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-setting="publish-type"] [data-test-setting-title]')).to.have.rendered.text('Email');
        await (0, _testHelpers.click)('[data-test-setting="publish-at"] [data-test-setting-title]');
        await (0, _testHelpers.click)('[data-test-setting="publish-at"] [data-test-radio="schedule"]');
        const siteTz = this.server.db.settings.findBy({
          key: 'timezone'
        }).value;
        const newDate = (0, _moment.default)().tz(siteTz).add(4, 'days').add(5, 'hours').set('second', 0);
        await (0, _testHelpers.fillIn)('[data-test-setting="publish-at"] [data-test-date-time-picker-date-input]', newDate.format('YYYY-MM-DD'));
        await (0, _testHelpers.blur)('[data-test-setting="publish-at"] [data-test-date-time-picker-date-input]');
        await (0, _testHelpers.fillIn)('[data-test-setting="publish-at"] [data-test-date-time-picker-time-input]', newDate.format('HH:mm'));
        await (0, _testHelpers.blur)('[data-test-setting="publish-at"] [data-test-date-time-picker-time-input]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-setting="publish-at"] [data-test-date-time-picker-time-input]')).to.have.value(newDate.format('HH:mm'));
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-setting="publish-at"] [data-test-setting-title]'), 'publish-at title after change').to.have.rendered.text('In 4 days');
        await (0, _testHelpers.click)('[data-test-button="continue"]'); // has correct confirm text

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-text="confirm-details"]')).to.have.rendered.text(`On ${newDate.format('D MMM YYYY')} at ${newDate.format('HH:mm')} your post will be delivered to all 7 subscribers, and will not be published on your site.`);
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="confirm-publish"]')).to.have.rendered.text(`Send email, on ${newDate.format('MMMM Do')}`);
        await (0, _testHelpers.click)('[data-test-button="confirm-publish"]');
        (0, _chai.expect)(post.attrs.emailOnly).to.be.true;
      });
      it('can publish');
      it('can schedule publish');
      it('respects default recipient settings - usually nobody', async function () {
        // switch to "usually nobody" setting
        // - doing it this way so we're not testing potentially stale mocked setting keys/values
        await (0, _visit.visit)('/settings/newsletters');
        await (0, _testHelpers.click)('[data-test-toggle-membersemail]');
        await (0, _helpers.selectChoose)('[data-test-select="default-recipients"]', 'Usually nobody');
        await (0, _testHelpers.click)('[data-test-button="save-members-settings"]');
        const post = this.server.create('post', {
          status: 'draft'
        });
        await (0, _visit.visit)(`/editor/post/${post.id}`);
        await (0, _testHelpers.click)('[data-test-button="publish-flow"]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-setting="publish-type"] [data-test-setting-title]'), 'publish type title').to.have.trimmed.text('Publish');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-setting="email-recipients"] [data-test-setting-title]'), 'recipients title').to.have.trimmed.text('Not sent as newsletter');
        await (0, _testHelpers.click)('[data-test-setting="publish-type"] [data-test-setting-title]'); // email-related options are enabled

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-publish-type="publish+send"]')).to.not.have.attribute('disabled');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-publish-type="send"]')).to.not.have.attribute('disabled');
        await (0, _testHelpers.click)('[data-test-publish-type="publish+send"]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-setting="email-recipients"] [data-test-setting-title]'), 'recipients title').to.have.trimmed.rendered.text('All 7 subscribers');
      });
      it('handles Mailgun not being set up', async function () {
        (0, _mailgun.disableMailgun)(this.server);
        const post = this.server.create('post', {
          status: 'draft'
        });
        await (0, _visit.visit)(`/editor/post/${post.id}`);
        await (0, _testHelpers.click)('[data-test-button="publish-flow"]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-setting="publish-type"] [data-test-setting-title]'), 'publish type title').to.have.trimmed.text('Publish');
        await (0, _testHelpers.click)('[data-test-setting="publish-type"] [data-test-setting-title]'); // mailgun not set up notice is shown

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-publish-type-error]'), 'publish type error').to.exist;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-publish-type-error="no-mailgun"]'), 'publish type error text').to.exist; // email-related options are disabled

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-publish-type="publish+send"]')).to.have.attribute('disabled');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-publish-type="send"]')).to.have.attribute('disabled');
      });
      it('handles no members present', async function () {
        this.server.db.members.remove();
        this.server.db.newsletters.update({
          memberIds: []
        });
        const post = this.server.create('post', {
          status: 'draft'
        });
        await (0, _visit.visit)(`/editor/post/${post.id}`);
        await (0, _testHelpers.click)('[data-test-button="publish-flow"]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-setting="publish-type"] [data-test-setting-title]'), 'publish type title').to.have.trimmed.text('Publish');
        await (0, _testHelpers.click)('[data-test-setting="publish-type"] [data-test-setting-title]'); // no-members notice is shown

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-publish-type-error]'), 'publish type error').to.exist;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-publish-type-error="no-members"]'), 'publish type error text').to.exist; // email-related options are disabled

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-publish-type="publish+send"]')).to.have.attribute('disabled');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-publish-type="send"]')).to.have.attribute('disabled');
      });
      it('handles member limits');
      it('handles server error when confirming');
      it('handles email sending error');
    });
  });
});
define("ghost-admin/tests/acceptance/error-handling-test", ["miragejs", "ember-simple-auth/test-support", "mocha", "@ember/test-helpers", "chai", "ember-mocha", "ember-cli-mirage/test-support", "ghost-admin/mirage/utils"], function (_miragejs, _testSupport, _mocha, _testHelpers, _chai, _emberMocha, _testSupport2, _utils) {
  "use strict";

  let htmlErrorResponse = function () {
    return new _miragejs.Response(504, {
      'Content-Type': 'text/html'
    }, '<!DOCTYPE html><head><title>Server Error</title></head><body>504 Gateway Timeout</body></html>');
  };

  (0, _mocha.describe)('Acceptance: Error Handling', function () {
    let hooks = (0, _emberMocha.setupApplicationTest)();
    (0, _testSupport2.setupMirage)(hooks);
    (0, _mocha.describe)('VersionMismatch errors', function () {
      (0, _mocha.describe)('logged in', function () {
        (0, _mocha.beforeEach)(async function () {
          let role = this.server.create('role', {
            name: 'Administrator'
          });
          this.server.create('user', {
            roles: [role]
          });
          return await (0, _testSupport.authenticateSession)();
        });
        (0, _mocha.it)('displays an alert and disables navigation when saving', async function () {
          this.server.createList('post', 3); // mock the post save endpoint to return version mismatch

          this.server.put('/posts/:id', _utils.versionMismatchResponse);
          await (0, _testHelpers.visit)('/posts');
          await (0, _testHelpers.click)('.posts-list li:nth-of-type(2) a'); // select second post

          await (0, _testHelpers.fillIn)('[data-test-editor-title-input]', 'Updated post');
          await (0, _testHelpers.blur)('[data-test-editor-title-input]'); // has the refresh to update alert

          (0, _chai.expect)((0, _testHelpers.findAll)('.gh-alert').length).to.equal(1);
          (0, _chai.expect)((0, _testHelpers.find)('.gh-alert').textContent).to.match(/refresh/); // try navigating back to the content list

          await (0, _testHelpers.click)('[data-test-link="posts"]');
          (0, _chai.expect)((0, _testHelpers.currentRouteName)()).to.equal('editor.edit');
        });
        (0, _mocha.it)('displays alert and aborts the transition when navigating', async function () {
          await (0, _testHelpers.visit)('/posts'); // mock the tags endpoint to return version mismatch

          this.server.get('/tags/', _utils.versionMismatchResponse);
          await (0, _testHelpers.click)('[data-test-nav="tags"]'); // navigation is blocked on loading screen

          (0, _chai.expect)((0, _testHelpers.currentRouteName)()).to.equal('tags_loading'); // has the refresh to update alert

          (0, _chai.expect)((0, _testHelpers.findAll)('.gh-alert').length).to.equal(1);
          (0, _chai.expect)((0, _testHelpers.find)('.gh-alert').textContent).to.match(/refresh/);
        });
      });
      (0, _mocha.describe)('logged out', function () {
        (0, _mocha.it)('displays alert', async function () {
          this.server.post('/session', _utils.versionMismatchResponse);
          await (0, _testHelpers.visit)('/signin');
          await (0, _testHelpers.fillIn)('[name="identification"]', 'test@example.com');
          await (0, _testHelpers.fillIn)('[name="password"]', 'password');
          await (0, _testHelpers.click)('.js-login-button'); // has the refresh to update alert

          (0, _chai.expect)((0, _testHelpers.findAll)('.gh-alert').length).to.equal(1);
          (0, _chai.expect)((0, _testHelpers.find)('.gh-alert').textContent).to.match(/refresh/);
        });
      });
    });
    (0, _mocha.describe)('CloudFlare errors', function () {
      (0, _mocha.beforeEach)(async function () {
        this.server.loadFixtures();
        let roles = this.server.schema.roles.where({
          name: 'Administrator'
        });
        this.server.create('user', {
          roles
        });
        return await (0, _testSupport.authenticateSession)();
      });
      (0, _mocha.it)('handles Ember Data HTML response', async function () {
        this.server.put('/posts/1/', htmlErrorResponse);
        this.server.create('post');
        await (0, _testHelpers.visit)('/editor/post/1');
        await (0, _testHelpers.fillIn)('[data-test-editor-title-input]', 'Updated post');
        await (0, _testHelpers.blur)('[data-test-editor-title-input]');
        (0, _chai.expect)((0, _testHelpers.findAll)('.gh-alert').length).to.equal(1);
        (0, _chai.expect)((0, _testHelpers.find)('.gh-alert').textContent).to.not.match(/html>/);
        (0, _chai.expect)((0, _testHelpers.find)('.gh-alert').textContent).to.match(/Request was rejected due to server error/);
      });
      (0, _mocha.it)('handles ember-ajax HTML response', async function () {
        this.server.del('/themes/foo/', htmlErrorResponse);
        await (0, _testHelpers.visit)('/settings/design/change-theme');
        await (0, _testHelpers.click)('[data-test-button="toggle-advanced"]');
        await (0, _testHelpers.click)('[data-test-theme-id="foo"] [data-test-button="actions"]');
        await (0, _testHelpers.click)('[data-test-actions-for="foo"] [data-test-button="delete"]');
        await (0, _testHelpers.click)('[data-test-modal="delete-theme"] [data-test-button="confirm"]');
        (0, _chai.expect)((0, _testHelpers.findAll)('.gh-alert').length).to.equal(1);
        (0, _chai.expect)((0, _testHelpers.find)('.gh-alert').textContent).to.not.match(/html>/);
        (0, _chai.expect)((0, _testHelpers.find)('.gh-alert').textContent).to.match(/Request was rejected due to server error/);
      });
    });
  });
});
define("ghost-admin/tests/acceptance/launch-flow-test", ["ember-simple-auth/test-support", "@ember/test-helpers", "mocha", "chai", "ember-mocha", "ember-cli-mirage/test-support"], function (_testSupport, _testHelpers, _mocha, _chai, _emberMocha, _testSupport2) {
  "use strict";

  (0, _mocha.describe)('Acceptance: Launch flow', function () {
    const hooks = (0, _emberMocha.setupApplicationTest)();
    (0, _testSupport2.setupMirage)(hooks);
    (0, _mocha.it)('is not accessible when logged out', async function () {
      await (0, _testHelpers.visit)('/launch');
      (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/signin');
    });
    (0, _mocha.describe)('when logged in', function () {
      beforeEach(async function () {
        let role = this.server.create('role', {
          name: 'Owner'
        });
        this.server.create('user', {
          roles: [role]
        });
        return await (0, _testSupport.authenticateSession)();
      });
      (0, _mocha.it)('can visit /launch', async function () {
        await (0, _testHelpers.visit)('/launch');
        (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/launch');
      });
    });
  });
});
define("ghost-admin/tests/acceptance/members-activity-test", ["ember-simple-auth/test-support", "@ember/test-helpers", "mocha", "chai", "ember-mocha", "ember-cli-mirage/test-support", "ghost-admin/tests/helpers/visit"], function (_testSupport, _testHelpers, _mocha, _chai, _emberMocha, _testSupport2, _visit) {
  "use strict";

  (0, _mocha.describe)('Acceptance: Members activity', function () {
    const hooks = (0, _emberMocha.setupApplicationTest)();
    (0, _testSupport2.setupMirage)(hooks);
    (0, _mocha.it)('redirects when not authenticated', async function () {
      await (0, _testSupport.invalidateSession)();
      await (0, _visit.visit)('/members-activity');
      (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/signin');
    });
    (0, _mocha.it)('redirects non-admins', async function () {
      await (0, _testSupport.invalidateSession)();
      const role = this.server.create('role', {
        name: 'Editor'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/members-activity');
      (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/site');
    });
    (0, _mocha.describe)('as admin', function () {
      beforeEach(async function () {
        const role = this.server.create('role', {
          name: 'Administrator'
        });
        this.server.create('user', {
          roles: [role]
        });
        await (0, _testSupport.authenticateSession)();
      });
      (0, _mocha.it)('renders', async function () {
        await (0, _visit.visit)('/members-activity');
        (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/members-activity');
      });
    });
  });
});
define("ghost-admin/tests/acceptance/members-test", ["moment", "ember-simple-auth/test-support", "mocha", "@ember/test-helpers", "chai", "ember-mocha", "ember-cli-mirage/test-support", "ember-concurrency", "ghost-admin/tests/helpers/visit"], function (_moment, _testSupport, _mocha, _testHelpers, _chai, _emberMocha, _testSupport2, _emberConcurrency, _visit) {
  "use strict";

  (0, _mocha.describe)('Acceptance: Members', function () {
    let hooks = (0, _emberMocha.setupApplicationTest)();
    (0, _testSupport2.setupMirage)(hooks);
    (0, _mocha.it)('redirects to signin when not authenticated', async function () {
      await (0, _testSupport.invalidateSession)();
      await (0, _visit.visit)('/members');
      (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/signin');
    });
    (0, _mocha.it)('redirects non-admins to site', async function () {
      let role = this.server.create('role', {
        name: 'Editor'
      });
      this.server.create('user', {
        roles: [role]
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/members');
      (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/site');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-nav="members"]'), 'sidebar link').to.not.exist;
    });
    (0, _mocha.describe)('as owner', function () {
      (0, _mocha.beforeEach)(async function () {
        this.server.loadFixtures('configs');
        let role = this.server.create('role', {
          name: 'Owner'
        });
        this.server.create('user', {
          roles: [role]
        });
        return await (0, _testSupport.authenticateSession)();
      });
      (0, _mocha.it)('it renders, can be navigated, can edit member', async function () {
        let member1 = this.server.create('member', {
          createdAt: _moment.default.utc().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss')
        });
        this.server.create('member', {
          createdAt: _moment.default.utc().subtract(2, 'day').format('YYYY-MM-DD HH:mm:ss')
        });
        await (0, _visit.visit)('/members');
        await (0, _testHelpers.settled)(); // lands on correct page

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/members'); // it has correct page title

        (0, _chai.expect)(document.title, 'page title').to.equal('Members - Test Blog'); // it lists all members

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, 'members list count').to.equal(2);
        let member = (0, _testHelpers.find)('[data-test-list="members-list-item"]');
        (0, _chai.expect)(member.querySelector('.gh-members-list-name').textContent, 'member list item title').to.equal(member1.name); // it does not add ?include=email_recipients

        const membersRequests = this.server.pretender.handledRequests.filter(r => r.url.match(/\/members\/(\?|$)/));
        (0, _chai.expect)(membersRequests[0].url).to.not.have.string('email_recipients');
        await (0, _visit.visit)(`/members/${member1.id}`); // // second wait is needed for the member details to settle

        await (0, _testHelpers.settled)(); // it shows selected member form

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="member-name"]').value, 'loads correct member into form').to.equal(member1.name);
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="member-email"]').value, 'loads correct email into form').to.equal(member1.email); // trigger save

        await (0, _testHelpers.fillIn)('[data-test-input="member-name"]', 'New Name');
        await (0, _testHelpers.blur)('[data-test-input="member-name"]');
        await (0, _testHelpers.click)('[data-test-button="save"]'); // extra timeout needed for Travis - sometimes it doesn't update
        // quick enough and an extra wait() call doesn't help

        await (0, _emberConcurrency.timeout)(100);
        await (0, _testHelpers.click)('[data-test-link="members-back"]'); // lands on correct page

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/members');
      });
      (0, _mocha.it)('can create a new member', async function () {
        this.server.create('member', {
          createdAt: _moment.default.utc().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss')
        });
        await (0, _visit.visit)('/members');
        await (0, _testHelpers.settled)(); // lands on correct page

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/members'); // it has correct page title

        (0, _chai.expect)(document.title, 'page title').to.equal('Members - Test Blog'); // it lists all members

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, 'members list count').to.equal(1); //  start new member

        await (0, _testHelpers.click)('[data-test-new-member-button="true"]'); // it navigates to the new member route

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'new member URL').to.equal('/members/new'); // it displays the new member form

        (0, _chai.expect)((0, _testHelpers.find)('.gh-canvas-header h2').textContent, 'settings pane title').to.contain('New member'); // all fields start blank

        (0, _testHelpers.findAll)('.gh-member-settings-primary .gh-input').forEach(function (elem) {
          (0, _chai.expect)(elem.value, `input field for ${elem.getAttribute('name')}`).to.be.empty;
        }); // save new member

        await (0, _testHelpers.fillIn)('[data-test-input="member-name"]', 'New Name');
        await (0, _testHelpers.blur)('[data-test-input="member-name"]');
        await (0, _testHelpers.fillIn)('[data-test-input="member-email"]', 'example@domain.com');
        await (0, _testHelpers.blur)('[data-test-input="member-email"]');
        await (0, _testHelpers.click)('[data-test-button="save"]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="member-name"]').value, 'name has been preserved').to.equal('New Name');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="member-email"]').value, 'email has been preserved').to.equal('example@domain.com');
      });
      (0, _mocha.it)('can bulk delete members', async function () {
        // members to be kept
        this.server.createList('member', 6); // imported members to be deleted

        const label = this.server.create('label');
        this.server.createList('member', 5, {
          labels: [label]
        });
        await (0, _visit.visit)('/members');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-member]').length).to.equal(11);
        await (0, _testHelpers.click)('[data-test-button="members-actions"]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="delete-selected"]')).to.not.exist; // a filter is needed for the delete-selected button to show

        await (0, _testHelpers.click)('[data-test-button="members-filter-actions"]');
        await (0, _testHelpers.fillIn)('[data-test-members-filter="0"] [data-test-select="members-filter"]', 'label');
        await (0, _testHelpers.click)('.gh-member-label-input input');
        await (0, _testHelpers.click)(`[data-test-label-filter="${label.name}"]`);
        await (0, _testHelpers.click)(`[data-test-button="members-apply-filter"]`);
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-member]').length).to.equal(5);
        (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/members?filter=label%3A%5Blabel-0%5D');
        await (0, _testHelpers.click)('[data-test-button="members-actions"]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="delete-selected"]')).to.exist;
        await (0, _testHelpers.click)('[data-test-button="delete-selected"]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="delete-members"]')).to.exist;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-text="delete-count"]')).to.have.text('5 members'); // ensure export endpoint gets hit with correct query params when deleting

        let exportQueryParams;
        this.server.get('/members/upload', (schema, request) => {
          exportQueryParams = request.queryParams;
        });
        await (0, _testHelpers.click)('[data-test-button="confirm"]');
        (0, _chai.expect)(exportQueryParams).to.deep.equal({
          filter: 'label:[label-0]',
          limit: 'all'
        });
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-text="deleted-count"]')).to.have.text('5 members');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="confirm"]')).to.not.exist; // members filter is reset

        (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/members');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-member]').length).to.equal(6);
        await (0, _testHelpers.click)('[data-test-button="close-modal"]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="delete-members"]')).to.not.exist;
      });
    });
  });
});
define("ghost-admin/tests/acceptance/members/details-test", ["ember-simple-auth/test-support", "@ember/test-helpers", "ghost-admin/tests/helpers/labs-flag", "ghost-admin/tests/helpers/newsletters", "ghost-admin/tests/helpers/stripe", "chai", "ember-mocha", "ember-cli-mirage/test-support", "ghost-admin/tests/helpers/visit"], function (_testSupport, _testHelpers, _labsFlag, _newsletters, _stripe, _chai, _emberMocha, _testSupport2, _visit) {
  "use strict";

  describe('Acceptance: Member details', function () {
    let hooks = (0, _emberMocha.setupApplicationTest)();
    (0, _testSupport2.setupMirage)(hooks);
    let clock;
    let tier;
    beforeEach(async function () {
      this.server.loadFixtures('configs');
      this.server.loadFixtures('settings');
      (0, _labsFlag.enableLabsFlag)(this.server, 'membersLastSeenFilter');
      (0, _labsFlag.enableLabsFlag)(this.server, 'membersTimeFilters');
      (0, _stripe.enableStripe)(this.server);
      (0, _newsletters.enableNewsletters)(this.server, true); // add a default tier that complimentary plans can be assigned to

      tier = this.server.create('tier', {
        id: '6213b3f6cb39ebdb03ebd810',
        name: 'Ghost Subscription',
        slug: 'ghost-subscription',
        created_at: '2022-02-21T16:47:02.000Z',
        updated_at: '2022-03-03T15:37:02.000Z',
        description: null,
        monthly_price_id: '6220df272fee0571b5dd0a0a',
        yearly_price_id: '6220df272fee0571b5dd0a0b',
        type: 'paid',
        active: true,
        welcome_page_url: '/'
      });
      let role = this.server.create('role', {
        name: 'Owner'
      });
      this.server.create('user', {
        roles: [role]
      });
      return await (0, _testSupport.authenticateSession)();
    });
    afterEach(function () {
      clock?.restore();
    });
    it('has a known base-state', async function () {
      const member = this.server.create('member', {
        id: 1,
        subscriptions: [this.server.create('subscription', {
          id: 'sub_1KZGcmEGb07FFvyN9jwrwbKu',
          customer: {
            id: 'cus_LFmBWoSkB84lnr',
            name: 'test',
            email: 'test@ghost.org'
          },
          plan: {
            id: 'price_1KZGc6EGb07FFvyNkK3umKiX',
            nickname: 'Monthly',
            amount: 500,
            interval: 'month',
            currency: 'USD'
          },
          status: 'canceled',
          start_date: '2022-03-03T15:31:27.000Z',
          default_payment_card_last4: '4242',
          cancel_at_period_end: false,
          cancellation_reason: null,
          current_period_end: '2022-04-03T15:31:27.000Z',
          price: {
            id: 'price_1KZGc6EGb07FFvyNkK3umKiX',
            price_id: '6220df272fee0571b5dd0a0a',
            nickname: 'Monthly',
            amount: 500,
            interval: 'month',
            type: 'recurring',
            currency: 'USD',
            tier: {
              id: 'prod_LFmAAmCnnbzrvL',
              name: 'Ghost Subscription',
              tier_id: tier.id
            }
          },
          offer: null
        }), this.server.create('subscription', {
          id: 'sub_1KZGi6EGb07FFvyNDjZq98g8',
          tier,
          customer: {
            id: 'cus_LFmGicpX4BkQKH',
            name: '123',
            email: 'test@ghost.org'
          },
          plan: {
            id: 'price_1KZGc6EGb07FFvyNkK3umKiX',
            nickname: 'Monthly',
            amount: 500,
            interval: 'month',
            currency: 'USD'
          },
          status: 'active',
          start_date: '2022-03-03T15:36:58.000Z',
          default_payment_card_last4: '4242',
          cancel_at_period_end: false,
          cancellation_reason: null,
          current_period_end: '2022-04-03T15:36:58.000Z',
          price: {
            id: 'price_1KZGc6EGb07FFvyNkK3umKiX',
            price_id: '6220df272fee0571b5dd0a0a',
            nickname: 'Monthly',
            amount: 500,
            interval: 'month',
            type: 'recurring',
            currency: 'USD',
            tier: {
              id: 'prod_LFmAAmCnnbzrvL',
              name: 'Ghost Subscription',
              tier_id: tier.id
            }
          },
          offer: null
        })],
        tiers: [tier]
      });
      await (0, _visit.visit)(`/members/${member.id}`);
      (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal(`/members/${member.id}`);
      (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-subscription]').length, 'displays all member subscriptions').to.equal(2);
      await (0, _testHelpers.click)('[data-test-button="save"]');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="save"]')).to.not.contain.text('Retry');
    });
    it('displays correctly one canceled subscription', async function () {
      const member = this.server.create('member', {
        id: 1,
        subscriptions: [this.server.create('subscription', {
          id: 'sub_1KZGcmEGb07FFvyN9jwrwbKu',
          tier,
          customer: {
            id: 'cus_LFmBWoSkB84lnr',
            name: 'test',
            email: 'test@ghost.org'
          },
          plan: {
            id: 'price_1KZGc6EGb07FFvyNkK3umKiX',
            nickname: 'Monthly',
            amount: 500,
            interval: 'month',
            currency: 'USD'
          },
          status: 'canceled',
          start_date: '2022-03-03T15:31:27.000Z',
          default_payment_card_last4: '4242',
          cancel_at_period_end: false,
          cancellation_reason: null,
          current_period_end: '2022-04-03T15:31:27.000Z',
          price: {
            id: 'price_1KZGc6EGb07FFvyNkK3umKiX',
            price_id: '6220df272fee0571b5dd0a0a',
            nickname: 'Monthly',
            amount: 500,
            interval: 'month',
            type: 'recurring',
            currency: 'USD',
            tier: {
              id: 'prod_LFmAAmCnnbzrvL',
              name: 'Ghost Subscription',
              tier_id: '6213b3f6cb39ebdb03ebd810'
            }
          },
          offer: null
        })],
        tiers: []
      });
      await (0, _visit.visit)(`/members/${member.id}`);
      (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal(`/members/${member.id}`);
      (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-subscription]').length, 'displays all member subscriptions').to.equal(1);
    });
    it('can add and remove complimentary subscription', async function () {
      const member = this.server.create('member', {
        name: 'Comp Member Test'
      });
      await (0, _visit.visit)(`/members/${member.id}`);
      (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-button="add-complimentary"]').length, '# of add complimentary buttons').to.equal(1);
      await (0, _testHelpers.click)('[data-test-button="add-complimentary"]');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="member-tier"]'), 'select tier modal').to.exist;
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-text="select-tier-desc"]')).to.contain.text('Comp Member Test');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-tier-option="6213b3f6cb39ebdb03ebd810"]')).to.have.exist;
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-tier-option="6213b3f6cb39ebdb03ebd810"]')).to.have.class('active');
      await (0, _testHelpers.click)('[data-test-button="save-comp-tier"]');
      (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-subscription]').length, '# of subscription blocks - after add comped').to.equal(1);
      await (0, _testHelpers.click)('[data-test-tier="6213b3f6cb39ebdb03ebd810"] [data-test-button="subscription-actions"]');
      await (0, _testHelpers.click)('[data-test-tier="6213b3f6cb39ebdb03ebd810"] [data-test-button="remove-complimentary"]');
      (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-subscription]').length, '# of subscription blocks - after remove comped').to.equal(0);
    });
    it('can add complimentary subscription when member has canceled subscriptions', async function () {
      const member = this.server.create('member', {
        name: 'Comped for canceled sub test',
        subscriptions: [this.server.create('subscription', {
          // tier, // _Not_ included as `tier` when subscription is canceled
          status: 'canceled',
          price: {
            id: 'price_1',
            tier: {
              id: 'prod_1',
              tier_id: tier.id
            }
          }
        })]
      });
      await (0, _visit.visit)(`/members/${member.id}`);
      (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-button="add-complimentary"]').length, '# of add complimentary buttons').to.equal(1);
      await (0, _testHelpers.click)('[data-test-button="add-complimentary"]');
      await (0, _testHelpers.click)('[data-test-button="save-comp-tier"]');
      (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-subscription]').length, '# of subscription blocks - after add comped').to.equal(2);
      (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-button="add-complimentary"]').length, '# of add complimentary buttons - after add comped').to.equal(0);
    });
    it('handles multiple tiers', async function () {
      const tier2 = this.server.create('tier', {
        name: 'Second tier',
        slug: 'second-tier',
        created_at: '2022-02-21T16:47:02.000Z',
        updated_at: '2022-03-03T15:37:02.000Z',
        description: null,
        monthly_price_id: '6220df272fee0571b5dd0a0a',
        yearly_price_id: '6220df272fee0571b5dd0a0b',
        type: 'paid',
        active: true,
        welcome_page_url: '/'
      });
      const member = this.server.create('member', {
        name: 'Multiple tier test'
      });
      this.server.create('subscription', {
        member,
        tier,
        status: 'canceled',
        price: {
          id: '1',
          tier: {
            tier_id: tier.id
          }
        }
      });
      this.server.create('subscription', {
        member,
        tier,
        status: 'canceled',
        price: {
          id: '1',
          tier: {
            tier_id: tier.id
          }
        }
      });
      this.server.create('subscription', {
        member,
        tier: tier2,
        status: 'canceled',
        price: {
          id: '1',
          tier: {
            tier_id: tier2.id
          }
        }
      });
      await (0, _visit.visit)(`/members/${member.id}`); // all tiers and subscriptions are shown

      (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-tier]').length, '# of tier blocks').to.equal(2);
      const p1 = `[data-test-tier="${tier.id}"]`;
      const p2 = `[data-test-tier="${tier2.id}"]`;
      (0, _chai.expect)((0, _testHelpers.find)(`${p1} [data-test-text="tier-name"]`)).to.contain.text('Ghost Subscription');
      (0, _chai.expect)((0, _testHelpers.findAll)(`${p1} [data-test-subscription]`).length, '# of tier 1 subscription blocks').to.equal(2);
      (0, _chai.expect)((0, _testHelpers.find)(`${p2} [data-test-text="tier-name"]`)).to.contain.text('Second tier');
      (0, _chai.expect)((0, _testHelpers.findAll)(`${p2} [data-test-subscription]`).length, '# of tier 2 subscription blocks').to.equal(1); // can add complimentary

      (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-button="add-complimentary"]').length, '# of add-complimentary buttons').to.equal(1);
      await (0, _testHelpers.click)('[data-test-button="add-complimentary"]');
      await (0, _testHelpers.click)(`[data-test-tier-option="${tier2.id}"]`);
      await (0, _testHelpers.click)('[data-test-button="save-comp-tier"]');
      (0, _chai.expect)((0, _testHelpers.findAll)(`${p2} [data-test-subscription]`).length, '# of tier 2 subscription blocks after comp added').to.equal(2);
    });
  });
});
define("ghost-admin/tests/acceptance/members/filter-test", ["moment", "sinon", "ember-simple-auth/test-support", "@ember/test-helpers", "ember-power-datepicker/test-support", "ghost-admin/tests/helpers/newsletters", "ghost-admin/tests/helpers/stripe", "chai", "ember-power-select/test-support/helpers", "ember-mocha", "ember-cli-mirage/test-support", "ghost-admin/tests/helpers/visit"], function (_moment, _sinon, _testSupport, _testHelpers, _testSupport2, _newsletters, _stripe, _chai, _helpers, _emberMocha, _testSupport3, _visit) {
  "use strict";

  describe('Acceptance: Members filtering', function () {
    let hooks = (0, _emberMocha.setupApplicationTest)();
    (0, _testSupport3.setupMirage)(hooks);
    let clock;
    beforeEach(async function () {
      this.server.loadFixtures('configs');
      this.server.loadFixtures('settings');
      (0, _stripe.enableStripe)(this.server);
      (0, _newsletters.enableNewsletters)(this.server, true);
      let role = this.server.create('role', {
        name: 'Owner'
      });
      this.server.create('user', {
        roles: [role]
      });
      return await (0, _testSupport.authenticateSession)();
    });
    afterEach(function () {
      clock?.restore();
    });
    it('has a known base-state', async function () {
      this.server.createList('member', 7);
      await (0, _visit.visit)('/members'); // members are listed

      (0, _chai.expect)((0, _testHelpers.find)('[data-test-table="members"]')).to.exist;
      (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of member rows').to.equal(7); // export is available

      (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="export-members"]'), 'export members button').to.exist;
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="export-members"]'), 'export members button').to.not.have.attribute('disabled'); // bulk actions are hidden

      (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="add-label-selected"]'), 'add label to selected button').to.not.exist;
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="remove-label-selected"]'), 'remove label from selected button').to.not.exist;
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="unsubscribe-selected"]'), 'unsubscribe selected button').to.not.exist;
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="delete-selected"]'), 'delete selected button').to.not.exist; // filter and search are inactive

      (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="members-search"]'), 'search input').to.exist;
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="members-search"]'), 'search input').to.not.have.class('active');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="members-filter-actions"] span'), 'filter button').to.not.have.class('gh-btn-label-green'); // standard columns are shown

      (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-table="members"] [data-test-table-column]').length).to.equal(4);
    });
    describe('filtering', function () {
      it('can filter by label', async function () {
        // add some labels to test the selection dropdown
        this.server.createList('label', 4); // add a labelled member so we can test the filter includes correctly

        const label = this.server.create('label');
        this.server.createList('member', 3, {
          labels: [label]
        }); // add some non-labelled members so we can see the filter excludes correctly

        this.server.createList('member', 4);
        await (0, _visit.visit)('/members');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of initial member rows').to.equal(7);
        await (0, _testHelpers.click)('[data-test-button="members-filter-actions"]');
        const filterSelector = `[data-test-members-filter="0"]`;
        await (0, _testHelpers.fillIn)(`${filterSelector} [data-test-select="members-filter"]`, 'label'); // has the right operators

        const operatorOptions = (0, _testHelpers.findAll)(`${filterSelector} [data-test-select="members-filter-operator"] option`);
        (0, _chai.expect)(operatorOptions).to.have.length(2);
        (0, _chai.expect)(operatorOptions[0]).to.have.value('is');
        (0, _chai.expect)(operatorOptions[1]).to.have.value('is-not'); // value dropdown can open and has all labels

        await (0, _testHelpers.click)(`${filterSelector} .gh-member-label-input .ember-basic-dropdown-trigger`);
        (0, _chai.expect)((0, _testHelpers.findAll)(`${filterSelector} [data-test-label-filter]`).length, '# of label options').to.equal(5); // selecting a value updates table

        await (0, _helpers.selectChoose)(`${filterSelector} .gh-member-label-input`, label.name);
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, `# of filtered member rows - ${label.name}`).to.equal(3); // table shows labels column+data

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-table-column="label"]')).to.exist;
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-table-data="label"]').length).to.equal(3);
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-table-data="label"]')).to.contain.text(label.name); // can delete filter

        await (0, _testHelpers.click)('[data-test-delete-members-filter="0"]');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows after delete').to.equal(7);
      });
      it('can filter by tier', async function () {
        // add multiple tiers to activate tiers filtering
        const newsletter = this.server.create('newsletter', {
          status: 'active'
        });
        this.server.createList('tier', 4); // add some members with tiers

        const tier = this.server.create('tier');
        this.server.createList('member', 3, {
          tiers: [tier],
          newsletters: [newsletter]
        }); // add some free members so we can see the filter excludes correctly

        this.server.createList('member', 4, {
          newsletters: [newsletter]
        });
        await (0, _visit.visit)('/members');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of initial member rows').to.equal(7);
        await (0, _testHelpers.click)('[data-test-button="members-filter-actions"]');
        const filterSelector = `[data-test-members-filter="0"]`;
        await (0, _testHelpers.fillIn)(`${filterSelector} [data-test-select="members-filter"]`, 'tier'); // has the right operators

        const operatorOptions = (0, _testHelpers.findAll)(`${filterSelector} [data-test-select="members-filter-operator"] option`);
        (0, _chai.expect)(operatorOptions).to.have.length(2);
        (0, _chai.expect)(operatorOptions[0]).to.have.value('is');
        (0, _chai.expect)(operatorOptions[1]).to.have.value('is-not'); // value dropdown can open and has all labels

        await (0, _testHelpers.click)(`${filterSelector} .gh-tier-token-input .ember-basic-dropdown-trigger`);
        (0, _chai.expect)((0, _testHelpers.findAll)(`${filterSelector} [data-test-tiers-segment]`).length, '# of label options').to.equal(5); // selecting a value updates table

        await (0, _helpers.selectChoose)(`${filterSelector} .gh-tier-token-input`, tier.name);
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, `# of filtered member rows - ${tier.name}`).to.equal(3); // table shows labels column+data

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-table-column="status"]')).to.exist;
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-table-data="status"]').length).to.equal(3);
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-table-data="status"]')).to.contain.text(tier.name); // can delete filter

        await (0, _testHelpers.click)('[data-test-delete-members-filter="0"]');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows after delete').to.equal(7);
      });
      it('can filter by newsletter subscription', async function () {
        // add some members to filter
        this.server.createList('member', 3, {
          subscribed: true
        });
        this.server.createList('member', 4, {
          subscribed: false
        });
        await (0, _visit.visit)('/members');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of initial member rows').to.equal(7);
        await (0, _testHelpers.click)('[data-test-button="members-filter-actions"]');
        const filterSelector = `[data-test-members-filter="0"]`;
        await (0, _testHelpers.fillIn)(`${filterSelector} [data-test-select="members-filter"]`, 'subscribed'); // has the right operators

        const operatorOptions = (0, _testHelpers.findAll)(`${filterSelector} [data-test-select="members-filter-operator"] option`);
        (0, _chai.expect)(operatorOptions).to.have.length(2);
        (0, _chai.expect)(operatorOptions[0]).to.have.value('is');
        (0, _chai.expect)(operatorOptions[1]).to.have.value('is-not'); // has the right values

        const valueOptions = (0, _testHelpers.findAll)(`${filterSelector} [data-test-select="members-filter-value"] option`);
        (0, _chai.expect)(valueOptions).to.have.length(2);
        (0, _chai.expect)(valueOptions[0]).to.have.value('true');
        (0, _chai.expect)(valueOptions[1]).to.have.value('false'); // applies default filter immediately

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - true').to.equal(3); // can change filter

        await (0, _testHelpers.fillIn)(`${filterSelector} [data-test-select="members-filter-value"]`, 'false');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - false').to.equal(4);
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-table-column="subscribed"]')).to.exist; // can delete filter

        await (0, _testHelpers.click)('[data-test-delete-members-filter="0"]');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows after delete').to.equal(7);
      });
      it('can filter by member status', async function () {
        // add some members to filter
        this.server.createList('member', 3, {
          status: 'paid'
        });
        this.server.createList('member', 4, {
          status: 'free'
        });
        this.server.createList('member', 2, {
          status: 'comped'
        });
        await (0, _visit.visit)('/members');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of initial member rows').to.equal(9);
        await (0, _testHelpers.click)('[data-test-button="members-filter-actions"]');
        const filterSelector = `[data-test-members-filter="0"]`;
        (0, _chai.expect)((0, _testHelpers.find)(`${filterSelector} [data-test-select="members-filter"] option[value="status"]`), 'status filter option').to.exist;
        await (0, _testHelpers.fillIn)(`${filterSelector} [data-test-select="members-filter"]`, 'status'); // has the right operators

        const operatorOptions = (0, _testHelpers.findAll)(`${filterSelector} [data-test-select="members-filter-operator"] option`);
        (0, _chai.expect)(operatorOptions).to.have.length(2);
        (0, _chai.expect)(operatorOptions[0]).to.have.value('is');
        (0, _chai.expect)(operatorOptions[1]).to.have.value('is-not'); // has the right values

        const valueOptions = (0, _testHelpers.findAll)(`${filterSelector} [data-test-select="members-filter-value"] option`);
        (0, _chai.expect)(valueOptions).to.have.length(3);
        (0, _chai.expect)(valueOptions[0]).to.have.value('paid');
        (0, _chai.expect)(valueOptions[1]).to.have.value('free');
        (0, _chai.expect)(valueOptions[2]).to.have.value('comped'); // applies default filter immediately

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - paid').to.equal(3); // can change filter

        await (0, _testHelpers.fillIn)(`${filterSelector} [data-test-select="members-filter-value"]`, 'comped');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - comped').to.equal(2);
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-table-column="status"]')).to.exist; // can delete filter

        await (0, _testHelpers.click)('[data-test-delete-members-filter="0"]');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows after delete').to.equal(9);
      });
      it('can filter by billing period', async function () {
        // add some members to filter
        this.server.createList('member', 3).forEach(member => this.server.create('subscription', {
          member,
          planInterval: 'month'
        }));
        this.server.createList('member', 4).forEach(member => this.server.create('subscription', {
          member,
          planInterval: 'year'
        }));
        await (0, _visit.visit)('/members');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of initial member rows').to.equal(7);
        await (0, _testHelpers.click)('[data-test-button="members-filter-actions"]');
        const filterSelector = `[data-test-members-filter="0"]`;
        await (0, _testHelpers.fillIn)(`${filterSelector} [data-test-select="members-filter"]`, 'subscriptions.plan_interval'); // has the right operators

        const operatorOptions = (0, _testHelpers.findAll)(`${filterSelector} [data-test-select="members-filter-operator"] option`);
        (0, _chai.expect)(operatorOptions).to.have.length(2);
        (0, _chai.expect)(operatorOptions[0]).to.have.value('is');
        (0, _chai.expect)(operatorOptions[1]).to.have.value('is-not'); // has the right values

        const valueOptions = (0, _testHelpers.findAll)(`${filterSelector} [data-test-select="members-filter-value"] option`);
        (0, _chai.expect)(valueOptions).to.have.length(2);
        (0, _chai.expect)(valueOptions[0]).to.have.value('month');
        (0, _chai.expect)(valueOptions[1]).to.have.value('year'); // applies default filter immediately

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - month').to.equal(3); // can change filter

        await (0, _testHelpers.fillIn)(`${filterSelector} [data-test-select="members-filter-value"]`, 'year');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - year').to.equal(4);
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-table-column="subscriptions.plan_interval"]')).to.exist; // can delete filter

        await (0, _testHelpers.click)('[data-test-delete-members-filter="0"]');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows after delete').to.equal(7);
      });
      it('can filter by stripe subscription status', async function () {
        // add some members to filter
        this.server.createList('member', 3).forEach(member => this.server.create('subscription', {
          member,
          status: 'active'
        }));
        this.server.createList('member', 4).forEach(member => this.server.create('subscription', {
          member,
          status: 'trialing'
        }));
        await (0, _visit.visit)('/members');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of initial member rows').to.equal(7);
        await (0, _testHelpers.click)('[data-test-button="members-filter-actions"]');
        const filterSelector = `[data-test-members-filter="0"]`;
        await (0, _testHelpers.fillIn)(`${filterSelector} [data-test-select="members-filter"]`, 'subscriptions.status'); // has the right operators

        const operatorOptions = (0, _testHelpers.findAll)(`${filterSelector} [data-test-select="members-filter-operator"] option`);
        (0, _chai.expect)(operatorOptions).to.have.length(2);
        (0, _chai.expect)(operatorOptions[0]).to.have.value('is');
        (0, _chai.expect)(operatorOptions[1]).to.have.value('is-not'); // has the right values

        const valueOptions = (0, _testHelpers.findAll)(`${filterSelector} [data-test-select="members-filter-value"] option`);
        (0, _chai.expect)(valueOptions).to.have.length(7);
        (0, _chai.expect)(valueOptions[0]).to.have.value('active');
        (0, _chai.expect)(valueOptions[1]).to.have.value('trialing');
        (0, _chai.expect)(valueOptions[2]).to.have.value('canceled');
        (0, _chai.expect)(valueOptions[3]).to.have.value('unpaid');
        (0, _chai.expect)(valueOptions[4]).to.have.value('past_due');
        (0, _chai.expect)(valueOptions[5]).to.have.value('incomplete');
        (0, _chai.expect)(valueOptions[6]).to.have.value('incomplete_expired'); // applies default filter immediately

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - active').to.equal(3); // can change filter

        await (0, _testHelpers.fillIn)(`${filterSelector} [data-test-select="members-filter-value"]`, 'trialing');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - trialing').to.equal(4);
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-table-column="subscriptions.status"]')).to.exist; // can delete filter

        await (0, _testHelpers.click)('[data-test-delete-members-filter="0"]');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows after delete').to.equal(7);
      });
      it('can filter by emails sent', async function () {
        // add some members to filter
        this.server.createList('member', 3, {
          emailCount: 5
        });
        this.server.createList('member', 4, {
          emailCount: 10
        });
        await (0, _visit.visit)('/members');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of initial member rows').to.equal(7);
        await (0, _testHelpers.click)('[data-test-button="members-filter-actions"]');
        const filterSelector = `[data-test-members-filter="0"]`;
        await (0, _testHelpers.fillIn)(`${filterSelector} [data-test-select="members-filter"]`, 'email_count'); // has the right operators

        const operatorOptions = (0, _testHelpers.findAll)(`${filterSelector} [data-test-select="members-filter-operator"] option`);
        (0, _chai.expect)(operatorOptions).to.have.length(3);
        (0, _chai.expect)(operatorOptions[0]).to.have.value('is');
        (0, _chai.expect)(operatorOptions[1]).to.have.value('is-greater');
        (0, _chai.expect)(operatorOptions[2]).to.have.value('is-less');
        const valueInput = `${filterSelector} [data-test-input="members-filter-value"]`; // has no default filter

        (0, _chai.expect)((0, _testHelpers.find)(valueInput)).to.have.value('');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - true').to.equal(7); // can focus/blur value input without issue

        await (0, _testHelpers.focus)(valueInput);
        await (0, _testHelpers.blur)(valueInput);
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - true').to.equal(7); // can change filter

        await (0, _testHelpers.fillIn)(valueInput, '5');
        await (0, _testHelpers.blur)(valueInput);
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - false').to.equal(3);
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-table-column="email_count"]')).to.exist; // can clear filter

        await (0, _testHelpers.fillIn)(valueInput, '');
        await (0, _testHelpers.blur)(valueInput);
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - false').to.equal(7); // can delete filter

        await (0, _testHelpers.click)('[data-test-delete-members-filter="0"]');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows').to.equal(7);
      });
      it('can filter by emails opened', async function () {
        // add some members to filter
        this.server.createList('member', 3, {
          emailOpenedCount: 5
        });
        this.server.createList('member', 4, {
          emailOpenedCount: 10
        });
        await (0, _visit.visit)('/members');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of initial member rows').to.equal(7);
        await (0, _testHelpers.click)('[data-test-button="members-filter-actions"]');
        const filterSelector = `[data-test-members-filter="0"]`;
        await (0, _testHelpers.fillIn)(`${filterSelector} [data-test-select="members-filter"]`, 'email_opened_count'); // has the right operators

        const operatorOptions = (0, _testHelpers.findAll)(`${filterSelector} [data-test-select="members-filter-operator"] option`);
        (0, _chai.expect)(operatorOptions).to.have.length(3);
        (0, _chai.expect)(operatorOptions[0]).to.have.value('is');
        (0, _chai.expect)(operatorOptions[1]).to.have.value('is-greater');
        (0, _chai.expect)(operatorOptions[2]).to.have.value('is-less');
        const valueInput = `${filterSelector} [data-test-input="members-filter-value"]`; // has no default filter

        (0, _chai.expect)((0, _testHelpers.find)(valueInput)).to.have.value('');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - default').to.equal(7); // can focus/blur value input without issue

        await (0, _testHelpers.focus)(valueInput);
        await (0, _testHelpers.blur)(valueInput);
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - after blur').to.equal(7); // can change filter

        await (0, _testHelpers.fillIn)(valueInput, '5');
        await (0, _testHelpers.blur)(valueInput);
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - input 5').to.equal(3);
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-table-column="email_opened_count"]')).to.exist; // can clear filter

        await (0, _testHelpers.fillIn)(valueInput, '');
        await (0, _testHelpers.blur)(valueInput);
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - cleared').to.equal(7); // can delete filter

        await (0, _testHelpers.click)('[data-test-delete-members-filter="0"]');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows after delete').to.equal(7);
      });
      it('can filter by open rate', async function () {
        // add some members to filter
        this.server.createList('member', 3, {
          emailOpenRate: 50
        });
        this.server.createList('member', 4, {
          emailOpenRate: 100
        });
        await (0, _visit.visit)('/members');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of initial member rows').to.equal(7);
        await (0, _testHelpers.click)('[data-test-button="members-filter-actions"]');
        const filterSelector = `[data-test-members-filter="0"]`;
        await (0, _testHelpers.fillIn)(`${filterSelector} [data-test-select="members-filter"]`, 'email_open_rate');
        const operatorSelector = `${filterSelector} [data-test-select="members-filter-operator"]`; // has the right operators

        const operatorOptions = (0, _testHelpers.findAll)(`${operatorSelector} option`);
        (0, _chai.expect)(operatorOptions).to.have.length(3);
        (0, _chai.expect)(operatorOptions[0]).to.have.value('is');
        (0, _chai.expect)(operatorOptions[1]).to.have.value('is-greater');
        (0, _chai.expect)(operatorOptions[2]).to.have.value('is-less');
        const valueInput = `${filterSelector} [data-test-input="members-filter-value"]`; // has no default filter

        (0, _chai.expect)((0, _testHelpers.find)(valueInput)).to.have.value('');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - default').to.equal(7); // can focus/blur value input without issue

        await (0, _testHelpers.focus)(valueInput);
        await (0, _testHelpers.blur)(valueInput);
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - after blur').to.equal(7); // can change filter

        await (0, _testHelpers.fillIn)(valueInput, '50');
        await (0, _testHelpers.blur)(valueInput);
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - value 50').to.equal(3);
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-table-column="email_open_rate"]')).to.exist; // can change operator

        await (0, _testHelpers.fillIn)(operatorSelector, 'is-greater');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - operator is-greater').to.equal(4); // it does not add duplicate column

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-table-column="email_open_rate"]')).to.exist;
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-table-column="email_open_rate"]').length).to.equal(1); // can clear filter

        await (0, _testHelpers.fillIn)(valueInput, '');
        await (0, _testHelpers.blur)(valueInput);
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - cleared').to.equal(7); // can delete filter

        await (0, _testHelpers.click)('[data-test-delete-members-filter="0"]');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows after delete').to.equal(7);
      });
      it('can filter by last seen date', async function () {
        clock = _sinon.default.useFakeTimers({
          now: (0, _moment.default)('2022-02-05 11:50:00.000Z').toDate(),
          shouldAdvanceTime: true
        }); // add some members to filter

        this.server.createList('member', 3, {
          lastSeenAt: (0, _moment.default)('2022-02-01 11:00:00').format('YYYY-MM-DD HH:mm:ss')
        });
        this.server.createList('member', 4, {
          lastSeenAt: (0, _moment.default)('2022-02-05 11:00:00').format('YYYY-MM-DD HH:mm:ss')
        });
        await (0, _visit.visit)('/members');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of initial member rows').to.equal(7);
        const filterSelect = `[data-test-members-filter="0"]`;
        const typeSelect = `${filterSelect} [data-test-select="members-filter"]`;
        const operatorSelect = `${filterSelect} [data-test-select="members-filter-operator"]`;
        const valueInput = `${filterSelect} [data-test-input="members-filter-value"] [data-test-date-picker-input]`;
        const valueDatePicker = `${filterSelect} [data-test-input="members-filter-value"]`;
        await (0, _testHelpers.click)('[data-test-button="members-filter-actions"]');
        await (0, _testHelpers.fillIn)(typeSelect, 'last_seen_at'); // has the right operators

        const operatorOptions = (0, _testHelpers.findAll)(`${operatorSelect} option`);
        (0, _chai.expect)(operatorOptions).to.have.length(4);
        (0, _chai.expect)(operatorOptions[0]).to.have.value('is-less');
        (0, _chai.expect)(operatorOptions[1]).to.have.value('is-or-less');
        (0, _chai.expect)(operatorOptions[2]).to.have.value('is-greater');
        (0, _chai.expect)(operatorOptions[3]).to.have.value('is-or-greater'); // has the right default operator

        (0, _chai.expect)((0, _testHelpers.find)(operatorSelect)).to.have.value('is-or-less'); // has expected default value

        (0, _chai.expect)((0, _testHelpers.find)(valueInput)).to.have.value('2022-02-05');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - default').to.equal(7); // can focus/blur value input without issue

        await (0, _testHelpers.focus)(valueInput);
        await (0, _testHelpers.blur)(valueInput);
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - after blur').to.equal(7); // can change operator

        await (0, _testHelpers.fillIn)(operatorSelect, 'is-less');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - is before 2022-02-05').to.equal(3); // can change filter via input

        await (0, _testHelpers.fillIn)(operatorSelect, 'is-greater');
        await (0, _testHelpers.fillIn)(valueInput, '2022-02-01');
        await (0, _testHelpers.blur)(valueInput);
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - is after 2022-02-01').to.equal(4); // can change filter via date picker

        await (0, _testHelpers.fillIn)(operatorSelect, 'is-or-greater');
        await (0, _testSupport2.datepickerSelect)(valueDatePicker, _moment.default.utc('2022-01-01').toDate());
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - is after 2022-01-01').to.equal(7); // table shows last seen column+data

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-table-column="last_seen_at"]')).to.exist;
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-table-data="last_seen_at"]').length).to.equal(7);
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-table-data="last_seen_at"]')).to.contain.trimmed.text('1 Feb 2022');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-table-data="last_seen_at"]')).to.contain.trimmed.text('4 days ago');
      });
      it('can filter by created at date', async function () {
        clock = _sinon.default.useFakeTimers({
          now: (0, _moment.default)('2022-03-01 09:00:00.000Z').toDate(),
          shouldAdvanceTime: true
        }); // add some members to filter

        this.server.createList('member', 3, {
          createdAt: (0, _moment.default)('2022-02-01 12:00:00').format('YYYY-MM-DD HH:mm:ss')
        });
        this.server.createList('member', 4, {
          createdAt: (0, _moment.default)('2022-02-05 12:00:00').format('YYYY-MM-DD HH:mm:ss')
        });
        await (0, _visit.visit)('/members');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of initial member rows').to.equal(7);
        await (0, _testHelpers.click)('[data-test-button="members-filter-actions"]');
        const filterSelect = `[data-test-members-filter="0"]`;
        const typeSelect = `${filterSelect} [data-test-select="members-filter"]`;
        const operatorSelect = `${filterSelect} [data-test-select="members-filter-operator"]`;
        (0, _chai.expect)((0, _testHelpers.find)(`${filterSelect} [data-test-select="members-filter"] option[value="created_at"]`), 'created_at filter option').to.exist;
        await (0, _testHelpers.fillIn)(typeSelect, 'created_at'); // has the right operators

        const operatorOptions = (0, _testHelpers.findAll)(`${operatorSelect} option`);
        (0, _chai.expect)(operatorOptions).to.have.length(4);
        (0, _chai.expect)(operatorOptions[0]).to.have.value('is-less');
        (0, _chai.expect)(operatorOptions[1]).to.have.value('is-or-less'); // expect(operatorOptions[2]).to.have.value('is');
        // expect(operatorOptions[3]).to.have.value('is-not');

        (0, _chai.expect)(operatorOptions[2]).to.have.value('is-greater');
        (0, _chai.expect)(operatorOptions[3]).to.have.value('is-or-greater');
        const valueDateInput = `${filterSelect} [data-test-input="members-filter-value"] [data-test-date-picker-input]`;
        const valueDatePicker = `${filterSelect} [data-test-input="members-filter-value"]`; // operator defaults to "on or before"

        (0, _chai.expect)((0, _testHelpers.find)(operatorSelect)).to.have.value('is-or-less'); // value defaults to today's date

        (0, _chai.expect)((0, _testHelpers.find)(valueDateInput)).to.have.value('2022-03-01');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - default').to.equal(7); // can change date

        await (0, _testSupport2.datepickerSelect)(valueDatePicker, _moment.default.utc('2022-02-03').toDate());
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - 2022-02-03').to.equal(3); // can change operator

        await (0, _testHelpers.fillIn)(operatorSelect, 'is-greater');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - is-greater').to.equal(4); // can populate filter from URL
        // TODO: leaving screen is needed, suggests component is not fully reactive and needs to be torn down.
        // - see <Members::Filter> constructor

        await (0, _visit.visit)(`/`);
        const filter = encodeURIComponent(`created_at:<='2022-02-01 23:59:59'`);
        await (0, _visit.visit)(`/members?filter=${filter}`);
        await (0, _testHelpers.click)('[data-test-button="members-filter-actions"]');
        (0, _chai.expect)((0, _testHelpers.find)(typeSelect), 'type select - from URL').to.have.value('created_at');
        (0, _chai.expect)((0, _testHelpers.find)(operatorSelect), 'operator select - from URL').to.have.value('is-or-less');
        (0, _chai.expect)((0, _testHelpers.find)(valueDateInput), 'date input - from URL').to.have.value('2022-02-01');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - from URL').to.equal(3); // "on or after" doesn't break

        await (0, _testHelpers.fillIn)(operatorSelect, 'is-or-greater');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - is-or-greater after URL change').to.equal(7); // it does not add extra column to table

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-table-column="created_at"]')).to.not.exist;
      });
      it('uses site timezone when filtering by date', async function () {
        // with a site timezone UTC-5 (Eastern Time Zone) we would expect date-based NQL filter strings
        // to be adjusted to UTC.
        //
        // Eg. "created on or after 2022-02-22" = `created_at:>='2022-02-22 05:00:00'
        //
        // we also need to convert back when parsing the NQL-based query param and make sure dates
        // shown in the members table match site timezone
        // UTC-5 timezone
        this.server.db.settings.update({
          key: 'timezone'
        }, {
          value: 'America/New_York'
        }); // 2022-02-21 signups

        this.server.createList('member', 3, {
          createdAt: _moment.default.utc('2022-02-22 04:00:00.000Z').format('YYYY-MM-DD HH:mm:ss')
        }); // 2022-02-22 signups

        this.server.createList('member', 4, {
          createdAt: _moment.default.utc('2022-02-22 05:00:00.000Z').format('YYYY-MM-DD HH:mm:ss')
        });
        await (0, _visit.visit)('/members');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of initial member rows').to.equal(7); // created dates in table should match the date in site timezone not UTC (in UTC they would all be 21st)

        const createdAtFields = (0, _testHelpers.findAll)('[data-test-list="members-list-item"] [data-test-table-data="created-at"]');
        (0, _chai.expect)(createdAtFields.filter(el => el.textContent.match(/21 Feb 2022/)).length).to.equal(3);
        (0, _chai.expect)(createdAtFields.filter(el => el.textContent.match(/22 Feb 2022/)).length).to.equal(4);
        const filterSelect = `[data-test-members-filter="0"]`;
        const typeSelect = `${filterSelect} [data-test-select="members-filter"]`;
        const operatorSelect = `${filterSelect} [data-test-select="members-filter-operator"]`;
        const valueInput = `${filterSelect} [data-test-input="members-filter-value"] [data-test-date-picker-input]`; // filter date is transformed to UTC equivalent timeframe when querying

        await (0, _testHelpers.click)('[data-test-button="members-filter-actions"]');
        await (0, _testHelpers.fillIn)(typeSelect, 'created_at');
        await (0, _testHelpers.fillIn)(operatorSelect, 'is-or-greater');
        await (0, _testHelpers.fillIn)(valueInput, '2022-02-22');
        await (0, _testHelpers.blur)(valueInput);
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of member rows - post filter').to.equal(4); // query param is transformed back to expected filter date value

        await (0, _visit.visit)('/'); // TODO: remove once <Members::Filter> component reacts to filter updates

        const filterQuery = encodeURIComponent(`created_at:<='2022-02-22 04:59:59'`);
        await (0, _visit.visit)(`/members?filter=${filterQuery}`);
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of member rows - post URL parse').to.equal(3);
        await (0, _testHelpers.click)('[data-test-button="members-filter-actions"]');
        (0, _chai.expect)((0, _testHelpers.find)(operatorSelect)).to.have.value('is-or-less');
        (0, _chai.expect)((0, _testHelpers.find)(valueInput)).to.have.value('2022-02-21'); // it initializes date filter with correct site timezone date
        // "local" is 1st March 04:00 but site time is 28th Feb 00:00

        clock = _sinon.default.useFakeTimers({
          now: (0, _moment.default)('2022-03-01 04:00:00.000Z').toDate(),
          shouldAdvanceTime: true
        });
        await (0, _testHelpers.click)('[data-test-delete-members-filter="0"]');
        await (0, _testHelpers.click)('[data-test-button="members-filter-actions"]');
        await (0, _testHelpers.fillIn)(typeSelect, 'created_at');
        (0, _chai.expect)((0, _testHelpers.find)(valueInput)).to.have.value('2022-02-28');
      });
      it('can filter by paid subscription start date', async function () {
        clock = _sinon.default.useFakeTimers({
          now: (0, _moment.default)('2022-03-01 09:00:00.000Z').toDate(),
          shouldAdvanceTime: true
        }); // add some members to filter

        this.server.createList('member', 3).forEach(member => this.server.create('subscription', {
          member,
          startDate: (0, _moment.default)('2022-02-01 12:00:00').format('YYYY-MM-DD HH:mm:ss')
        }));
        this.server.createList('member', 4).forEach(member => this.server.create('subscription', {
          member,
          startDate: (0, _moment.default)('2022-02-05 12:00:00').format('YYYY-MM-DD HH:mm:ss')
        }));
        this.server.createList('member', 2);
        await (0, _visit.visit)('/members');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of initial member rows').to.equal(9);
        await (0, _testHelpers.click)('[data-test-button="members-filter-actions"]');
        const filterSelect = `[data-test-members-filter="0"]`;
        const typeSelect = `${filterSelect} [data-test-select="members-filter"]`;
        const operatorSelect = `${filterSelect} [data-test-select="members-filter-operator"]`;
        (0, _chai.expect)((0, _testHelpers.find)(`${filterSelect} [data-test-select="members-filter"] option[value="subscriptions.start_date"]`), 'subscriptions.start_date filter option').to.exist;
        await (0, _testHelpers.fillIn)(typeSelect, 'subscriptions.start_date'); // has the right operators

        const operatorOptions = (0, _testHelpers.findAll)(`${operatorSelect} option`);
        (0, _chai.expect)(operatorOptions).to.have.length(4);
        (0, _chai.expect)(operatorOptions[0]).to.have.value('is-less');
        (0, _chai.expect)(operatorOptions[1]).to.have.value('is-or-less'); // expect(operatorOptions[2]).to.have.value('is');
        // expect(operatorOptions[3]).to.have.value('is-not');

        (0, _chai.expect)(operatorOptions[2]).to.have.value('is-greater');
        (0, _chai.expect)(operatorOptions[3]).to.have.value('is-or-greater');
        const valueDateInput = `${filterSelect} [data-test-input="members-filter-value"] [data-test-date-picker-input]`;
        const valueDatePicker = `${filterSelect} [data-test-input="members-filter-value"]`; // operator defaults to "on or before"

        (0, _chai.expect)((0, _testHelpers.find)(operatorSelect)).to.have.value('is-or-less'); // value defaults to today's date

        (0, _chai.expect)((0, _testHelpers.find)(valueDateInput)).to.have.value('2022-03-01');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - default').to.equal(7); // can change date

        await (0, _testSupport2.datepickerSelect)(valueDatePicker, _moment.default.utc('2022-02-03').toDate());
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - 2022-02-03').to.equal(3); // can change operator

        await (0, _testHelpers.fillIn)(operatorSelect, 'is-greater');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - is-greater').to.equal(4); // can populate filter from URL
        // TODO: leaving screen is needed, suggests component is not fully reactive and needs to be torn down.
        // - see <Members::Filter> constructor

        await (0, _visit.visit)(`/`);
        const filter = encodeURIComponent(`subscriptions.start_date:<='2022-02-01 23:59:59'`);
        await (0, _visit.visit)(`/members?filter=${filter}`);
        await (0, _testHelpers.click)('[data-test-button="members-filter-actions"]');
        (0, _chai.expect)((0, _testHelpers.find)(typeSelect), 'type select - from URL').to.have.value('subscriptions.start_date');
        (0, _chai.expect)((0, _testHelpers.find)(operatorSelect), 'operator select - from URL').to.have.value('is-or-less');
        (0, _chai.expect)((0, _testHelpers.find)(valueDateInput), 'date input - from URL').to.have.value('2022-02-01');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - from URL').to.equal(3); // it adds extra column to table

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-table-column="subscriptions.start_date"]')).to.exist;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-table-column="subscriptions.start_date"]')).to.contain.text('Paid start date');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-table-data="subscriptions.start_date"]').length).to.equal(3);
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-table-data="subscriptions.start_date"]')).to.contain.text('1 Feb 2022');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-table-data="subscriptions.start_date"]')).to.contain.text('a month ago');
      });
      it('can filter by name', async function () {
        this.server.create('member', {
          name: 'test-1'
        });
        this.server.create('member', {
          name: 'test-2'
        });
        this.server.create('member', {
          name: 'tset-1'
        });
        this.server.create('member', {
          name: 'tset-2'
        });
        this.server.create('member', {
          name: 'tset-3'
        });
        this.server.create('member', {
          name: 'hello'
        });
        this.server.create('member', {
          name: 'John O\'Nolan'
        });
        this.server.create('member', {
          name: null
        });
        await (0, _visit.visit)('/members');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of initial member rows').to.equal(8);
        await (0, _testHelpers.click)('[data-test-button="members-filter-actions"]');
        const filterSelect = `[data-test-members-filter="0"]`;
        const typeSelect = `${filterSelect} [data-test-select="members-filter"]`;
        const operatorSelect = `${filterSelect} [data-test-select="members-filter-operator"]`;
        const valueInput = `${filterSelect} [data-test-input="members-filter-value"]`;
        (0, _chai.expect)((0, _testHelpers.find)(`${filterSelect} [data-test-select="members-filter"] option[value="name"]`), 'name filter option').to.exist;
        await (0, _testHelpers.fillIn)(typeSelect, 'name'); // has the right operators

        const operatorOptions = (0, _testHelpers.findAll)(`${operatorSelect} option`);
        (0, _chai.expect)(operatorOptions).to.have.length(5);
        (0, _chai.expect)(operatorOptions[0]).to.have.value('is');
        (0, _chai.expect)(operatorOptions[1]).to.have.value('contains');
        (0, _chai.expect)(operatorOptions[2]).to.have.value('does-not-contain');
        (0, _chai.expect)(operatorOptions[3]).to.have.value('starts-with');
        (0, _chai.expect)(operatorOptions[4]).to.have.value('ends-with'); // has expected default operator and value

        (0, _chai.expect)((0, _testHelpers.find)(operatorSelect)).to.have.value('is');
        (0, _chai.expect)((0, _testHelpers.find)(valueInput)).to.have.value(''); // can change filter

        await (0, _testHelpers.fillIn)(valueInput, 'hello');
        await (0, _testHelpers.blur)(valueInput);
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - is "hello"').to.equal(1); // can change operator

        await (0, _testHelpers.fillIn)(operatorSelect, 'contains');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - contains "hello"').to.equal(1); // contains query works

        await (0, _testHelpers.fillIn)(valueInput, 'test');
        await (0, _testHelpers.blur)(valueInput);
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - contains "test"').to.equal(2); // starts with query works

        await (0, _testHelpers.fillIn)(operatorSelect, 'starts-with');
        await (0, _testHelpers.fillIn)(valueInput, 'tset');
        await (0, _testHelpers.blur)(valueInput);
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - starts with "tset"').to.equal(3); // ends with query works

        await (0, _testHelpers.fillIn)(operatorSelect, 'ends-with');
        await (0, _testHelpers.fillIn)(valueInput, '2');
        await (0, _testHelpers.blur)(valueInput);
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - ends with "2"').to.equal(2); // does not contain query works

        await (0, _testHelpers.fillIn)(operatorSelect, 'does-not-contain');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - does not contain "2"').to.equal(6); // can query with escaped chars

        await (0, _testHelpers.fillIn)(operatorSelect, 'contains');
        await (0, _testHelpers.fillIn)(valueInput, `O'Nolan`);
        await (0, _testHelpers.blur)(valueInput);
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - contains "O\'Nolan"').to.equal(1); // no duplicate column added (name is included in the "details" column)

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-table-column="name"]')).to.not.exist; // can handle contains operator in URL

        let filter = encodeURIComponent(`name:~'hello'`);
        await (0, _visit.visit)('/');
        await (0, _visit.visit)(`/members?filter=${filter}`);
        await (0, _testHelpers.click)('[data-test-button="members-filter-actions"]');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - from URL contains "hello"').to.equal(1);
        (0, _chai.expect)((0, _testHelpers.find)(operatorSelect)).to.have.value('contains');
        (0, _chai.expect)((0, _testHelpers.find)(valueInput)).to.have.value('hello'); // can handle starts-with operator in URL

        filter = encodeURIComponent(`name:~^'tset'`);
        await (0, _visit.visit)('/');
        await (0, _visit.visit)(`/members?filter=${filter}`);
        await (0, _testHelpers.click)('[data-test-button="members-filter-actions"]');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - from URL starts with "tset"').to.equal(3);
        (0, _chai.expect)((0, _testHelpers.find)(operatorSelect)).to.have.value('starts-with');
        (0, _chai.expect)((0, _testHelpers.find)(valueInput)).to.have.value('tset'); // can handle ends-with operator in URL

        filter = encodeURIComponent(`name:~$'2'`);
        await (0, _visit.visit)('/');
        await (0, _visit.visit)(`/members?filter=${filter}`);
        await (0, _testHelpers.click)('[data-test-button="members-filter-actions"]');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - from URL ends with "2"').to.equal(2);
        (0, _chai.expect)((0, _testHelpers.find)(operatorSelect)).to.have.value('ends-with');
        (0, _chai.expect)((0, _testHelpers.find)(valueInput)).to.have.value('2'); // can handle does-not-contain operator in URL

        filter = encodeURIComponent(`name:-~'2'`);
        await (0, _visit.visit)('/');
        await (0, _visit.visit)(`/members?filter=${filter}`);
        await (0, _testHelpers.click)('[data-test-button="members-filter-actions"]');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - from URL does not contain "2"').to.equal(6);
        (0, _chai.expect)((0, _testHelpers.find)(operatorSelect)).to.have.value('does-not-contain');
        (0, _chai.expect)((0, _testHelpers.find)(valueInput)).to.have.value('2'); // can handle escaped values in URL

        filter = encodeURIComponent(`name:~'O\\'Nolan'`);
        await (0, _visit.visit)('/');
        await (0, _visit.visit)(`/members?filter=${filter}`);
        await (0, _testHelpers.click)('[data-test-button="members-filter-actions"]');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - from URL contains "O\'Nolan"').to.equal(1);
        (0, _chai.expect)((0, _testHelpers.find)(operatorSelect)).to.have.value('contains');
        (0, _chai.expect)((0, _testHelpers.find)(valueInput)).to.have.value(`O'Nolan`); // can handle regex special chars in URL

        filter = encodeURIComponent(`name:~'test+test'`);
        await (0, _visit.visit)('/');
        await (0, _visit.visit)(`/members?filter=${filter}`);
        await (0, _testHelpers.click)('[data-test-button="members-filter-actions"]');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - from URL contains "test+test"').to.equal(0);
        (0, _chai.expect)((0, _testHelpers.find)(operatorSelect)).to.have.value('contains');
        (0, _chai.expect)((0, _testHelpers.find)(valueInput)).to.have.value(`test+test`);
      });
      it('can filter by email', async function () {
        this.server.create('member', {
          email: 'test-1@one.com'
        });
        this.server.create('member', {
          email: 'test-2@one.com'
        });
        this.server.create('member', {
          email: 'test-1@two.com'
        });
        this.server.create('member', {
          email: 'test-2@two.com'
        });
        this.server.create('member', {
          email: 'test-3@two.com'
        });
        this.server.create('member', {
          email: 'hello@hi.com'
        });
        this.server.create('member', {
          email: 'with+plus@fuzzy.org'
        });
        await (0, _visit.visit)('/members');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of initial member rows').to.equal(7);
        await (0, _testHelpers.click)('[data-test-button="members-filter-actions"]');
        const filterSelect = `[data-test-members-filter="0"]`;
        const typeSelect = `${filterSelect} [data-test-select="members-filter"]`;
        const operatorSelect = `${filterSelect} [data-test-select="members-filter-operator"]`;
        const valueInput = `${filterSelect} [data-test-input="members-filter-value"]`;
        (0, _chai.expect)((0, _testHelpers.find)(`${filterSelect} [data-test-select="members-filter"] option[value="email"]`), 'email filter option').to.exist;
        await (0, _testHelpers.fillIn)(typeSelect, 'email'); // has the right operators

        const operatorOptions = (0, _testHelpers.findAll)(`${operatorSelect} option`);
        (0, _chai.expect)(operatorOptions).to.have.length(5);
        (0, _chai.expect)(operatorOptions[0]).to.have.value('is');
        (0, _chai.expect)(operatorOptions[1]).to.have.value('contains');
        (0, _chai.expect)(operatorOptions[2]).to.have.value('does-not-contain');
        (0, _chai.expect)(operatorOptions[3]).to.have.value('starts-with');
        (0, _chai.expect)(operatorOptions[4]).to.have.value('ends-with'); // has expected default operator and value

        (0, _chai.expect)((0, _testHelpers.find)(operatorSelect)).to.have.value('is');
        (0, _chai.expect)((0, _testHelpers.find)(valueInput)).to.have.value(''); // can change filter

        await (0, _testHelpers.fillIn)(valueInput, 'hello@hi.com');
        await (0, _testHelpers.blur)(valueInput);
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - is "hello@hi.com"').to.equal(1); // can change operator

        await (0, _testHelpers.fillIn)(operatorSelect, 'contains');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - contains "hello"').to.equal(1); // contains query works

        await (0, _testHelpers.fillIn)(valueInput, 'test');
        await (0, _testHelpers.blur)(valueInput);
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - contains "test"').to.equal(5); // starts with query works

        await (0, _testHelpers.fillIn)(operatorSelect, 'starts-with');
        await (0, _testHelpers.fillIn)(valueInput, 'test-2');
        await (0, _testHelpers.blur)(valueInput);
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - starts with "test-2"').to.equal(2); // ends with query works

        await (0, _testHelpers.fillIn)(operatorSelect, 'ends-with');
        await (0, _testHelpers.fillIn)(valueInput, '.com');
        await (0, _testHelpers.blur)(valueInput);
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - ends with ".com"').to.equal(6); // does not contain query works

        await (0, _testHelpers.fillIn)(operatorSelect, 'does-not-contain');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - does not contain ".com"').to.equal(1); // can query with special chars

        await (0, _testHelpers.fillIn)(operatorSelect, 'contains');
        await (0, _testHelpers.fillIn)(valueInput, `with+plus`);
        await (0, _testHelpers.blur)(valueInput);
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - contains "with+plus"').to.equal(1); // no duplicate column added (email is included in the "details" column)

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-table-column="email"]')).to.not.exist; // can handle contains operator in URL

        let filter = encodeURIComponent(`email:~'hello'`);
        await (0, _visit.visit)('/');
        await (0, _visit.visit)(`/members?filter=${filter}`);
        await (0, _testHelpers.click)('[data-test-button="members-filter-actions"]');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - from URL contains "hello"').to.equal(1);
        (0, _chai.expect)((0, _testHelpers.find)(operatorSelect)).to.have.value('contains');
        (0, _chai.expect)((0, _testHelpers.find)(valueInput)).to.have.value('hello');
      });
      it('can filter by next billing date', async function () {
        clock = _sinon.default.useFakeTimers({
          now: (0, _moment.default)('2022-03-01 09:00:00.000Z').toDate(),
          shouldAdvanceTime: true
        }); // add some members to filter

        this.server.createList('member', 3).forEach(member => this.server.create('subscription', {
          member,
          currentPeriodEnd: (0, _moment.default)('2022-02-01 12:00:00').format('YYYY-MM-DD HH:mm:ss')
        }));
        this.server.createList('member', 4).forEach(member => this.server.create('subscription', {
          member,
          currentPeriodEnd: (0, _moment.default)('2022-02-05 12:00:00').format('YYYY-MM-DD HH:mm:ss')
        }));
        this.server.createList('member', 2);
        await (0, _visit.visit)('/members');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of initial member rows').to.equal(9);
        await (0, _testHelpers.click)('[data-test-button="members-filter-actions"]');
        const filterSelect = `[data-test-members-filter="0"]`;
        const typeSelect = `${filterSelect} [data-test-select="members-filter"]`;
        const operatorSelect = `${filterSelect} [data-test-select="members-filter-operator"]`;
        (0, _chai.expect)((0, _testHelpers.find)(`${filterSelect} [data-test-select="members-filter"] option[value="subscriptions.current_period_end"]`), 'subscriptions.current_period_end filter option').to.exist;
        await (0, _testHelpers.fillIn)(typeSelect, 'subscriptions.current_period_end'); // has the right operators

        const operatorOptions = (0, _testHelpers.findAll)(`${operatorSelect} option`);
        (0, _chai.expect)(operatorOptions).to.have.length(4);
        (0, _chai.expect)(operatorOptions[0]).to.have.value('is-less');
        (0, _chai.expect)(operatorOptions[1]).to.have.value('is-or-less'); // expect(operatorOptions[2]).to.have.value('is');
        // expect(operatorOptions[3]).to.have.value('is-not');

        (0, _chai.expect)(operatorOptions[2]).to.have.value('is-greater');
        (0, _chai.expect)(operatorOptions[3]).to.have.value('is-or-greater');
        const valueDateInput = `${filterSelect} [data-test-input="members-filter-value"] [data-test-date-picker-input]`;
        const valueDatePicker = `${filterSelect} [data-test-input="members-filter-value"]`; // operator defaults to "on or before"

        (0, _chai.expect)((0, _testHelpers.find)(operatorSelect)).to.have.value('is-or-less'); // value defaults to today's date

        (0, _chai.expect)((0, _testHelpers.find)(valueDateInput)).to.have.value('2022-03-01');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - default').to.equal(7); // can change date

        await (0, _testSupport2.datepickerSelect)(valueDatePicker, _moment.default.utc('2022-02-03').toDate());
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - 2022-02-03').to.equal(3); // can change operator

        await (0, _testHelpers.fillIn)(operatorSelect, 'is-greater');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - is-greater').to.equal(4); // can populate filter from URL
        // TODO: leaving screen is needed, suggests component is not fully reactive and needs to be torn down.
        // - see <Members::Filter> constructor

        await (0, _visit.visit)(`/`);
        const filter = encodeURIComponent(`subscriptions.current_period_end:<='2022-02-01 23:59:59'`);
        await (0, _visit.visit)(`/members?filter=${filter}`);
        await (0, _testHelpers.click)('[data-test-button="members-filter-actions"]');
        (0, _chai.expect)((0, _testHelpers.find)(typeSelect), 'type select - from URL').to.have.value('subscriptions.current_period_end');
        (0, _chai.expect)((0, _testHelpers.find)(operatorSelect), 'operator select - from URL').to.have.value('is-or-less');
        (0, _chai.expect)((0, _testHelpers.find)(valueDateInput), 'date input - from URL').to.have.value('2022-02-01');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of filtered member rows - from URL').to.equal(3); // it adds extra column to table

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-table-column="subscriptions.current_period_end"]')).to.exist;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-table-column="subscriptions.current_period_end"]')).to.contain.text('Next billing date');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-table-data="subscriptions.current_period_end"]').length).to.equal(3);
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-table-data="subscriptions.current_period_end"]')).to.contain.text('1 Feb 2022');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-table-data="subscriptions.current_period_end"]')).to.contain.text('a month ago');
      });
      it('can handle multiple filters', async function () {
        // add some members to filter
        this.server.createList('member', 1).forEach(member => this.server.create('subscription', {
          member,
          status: 'active'
        }));
        this.server.createList('member', 2).forEach(member => this.server.create('subscription', {
          member,
          status: 'trialing'
        }));
        this.server.createList('member', 3, {
          emailOpenRate: 50
        }).forEach(member => this.server.create('subscription', {
          member,
          status: 'trialing'
        }));
        this.server.createList('member', 4, {
          emailOpenRate: 100
        });
        await (0, _visit.visit)('/members');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of initial member rows').to.equal(10);
        await (0, _testHelpers.click)('[data-test-button="members-filter-actions"]');
        await (0, _testHelpers.fillIn)('[data-test-members-filter="0"] [data-test-select="members-filter"]', 'email_open_rate');
        await (0, _testHelpers.fillIn)('[data-test-members-filter="0"] [data-test-input="members-filter-value"]', '50');
        await (0, _testHelpers.blur)('[data-test-members-filter="0"] [data-test-input="members-filter-value"]');
        await (0, _testHelpers.click)('[data-test-button="add-members-filter"]');
        await (0, _testHelpers.fillIn)(`[data-test-members-filter="1"] [data-test-select="members-filter"]`, 'subscriptions.status');
        await (0, _testHelpers.fillIn)(`[data-test-members-filter="1"] [data-test-select="members-filter-value"]`, 'trialing');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of members rows after filter').to.equal(3);
        await (0, _testHelpers.click)('[data-test-button="members-apply-filter"]'); // all filtered columns are shown

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-table-column="email_open_rate"]')).to.exist;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-table-column="subscriptions.status"]')).to.exist; // bulk actions are shown

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="add-label-selected"]'), 'add label to selected button').to.exist;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="remove-label-selected"]'), 'remove label from selected button').to.exist;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="unsubscribe-selected"]'), 'unsubscribe selected button').to.exist;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="delete-selected"]'), 'delete selected button').to.exist; // filter is active and has # of filters

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="members-filter-actions"] span'), 'filter button').to.have.class('gh-btn-label-green');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="members-filter-actions"]'), 'filter button').to.contain.text('(2)'); // search is inactive

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="members-search"]'), 'search input').to.exist;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="members-search"]'), 'search input').to.not.have.class('active'); // can reset filter

        await (0, _testHelpers.click)('[data-test-button="members-filter-actions"]');
        await (0, _testHelpers.click)('[data-test-button="reset-members-filter"]');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of initial member rows').to.equal(10); // filter is inactive

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="members-filter-actions"] span'), 'filter button').to.not.have.class('gh-btn-label-green');
      });
      it('has a no-match state', async function () {
        this.server.createList('member', 5).forEach(member => this.server.create('subscription', {
          member,
          status: 'active'
        }));
        await (0, _visit.visit)('/members');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of initial member rows').to.equal(5);
        await (0, _testHelpers.click)('[data-test-button="members-filter-actions"]');
        await (0, _testHelpers.fillIn)('[data-test-members-filter="0"] [data-test-select="members-filter"]', 'email_open_rate');
        await (0, _testHelpers.fillIn)('[data-test-members-filter="0"] [data-test-input="members-filter-value"]', '50');
        await (0, _testHelpers.blur)('[data-test-members-filter="0"] [data-test-input="members-filter-value"]');
        await (0, _testHelpers.click)('[data-test-button="members-apply-filter"]'); // replaces members table with the no-matching members state

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-table="members"]')).to.not.exist;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-no-matching-members]')).to.exist; // search input is hidden

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="members-search"]')).to.not.be.visible; // export is disabled

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="export-members"]')).to.have.attribute('disabled'); // bulk actions are hidden

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="add-label-selected"]')).to.not.exist;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="remove-label-selected"]')).to.not.exist;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="unsubscribe-selected"]')).to.not.exist;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="delete-selected"]')).to.not.exist; // can clear the filter

        await (0, _testHelpers.click)('[data-test-no-matching-members] [data-test-button="show-all-members"]');
        (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/members');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="members-filter-actions"] span'), 'filter button').to.not.have.class('gh-btn-label-green');
      });
      it('resets filter operator when changing filter type', async function () {
        // BUG: changing the filter type was not resetting the filter operator
        // meaning you could have an "is-greater" operator applied to an
        // "is/is-not" filter type
        this.server.createList('member', 3).forEach(member => this.server.create('subscription', {
          member,
          status: 'active'
        }));
        this.server.createList('member', 4, {
          emailCount: 10
        });
        await (0, _visit.visit)('/members');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of initial member rows').to.equal(7);
        await (0, _testHelpers.click)('[data-test-button="members-filter-actions"]');
        const filter = '[data-test-members-filter="0"]';
        await (0, _testHelpers.fillIn)(`${filter} [data-test-select="members-filter"]`, 'email_count');
        await (0, _testHelpers.fillIn)(`${filter} [data-test-select="members-filter-operator"]`, 'is-greater');
        await (0, _testHelpers.fillIn)(`${filter} [data-test-input="members-filter-value"]`, '9');
        await (0, _testHelpers.blur)(`${filter} [data-test-input="members-filter-value"]`);
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of members after email_count filter').to.equal(4);
        await (0, _testHelpers.fillIn)(`${filter} [data-test-select="members-filter"]`, 'subscriptions.status');
        (0, _chai.expect)((0, _testHelpers.find)(`${filter} [data-test-select="members-filter-operator"]`)).to.have.value('is');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of members after email_count filter').to.equal(3);
      });
      it('hides paid filters when stripe isn\'t connected', async function () {
        // disconnect stripe
        this.server.db.settings.update({
          key: 'paid_members_enabled'
        }, {
          value: false
        });
        this.server.createList('member', 10);
        await (0, _visit.visit)('/members');
        await (0, _testHelpers.click)('[data-test-button="members-filter-actions"]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-members-filter="0"] [data-test-select="members-filter"] optgroup[label="Subscription"]'), 'Subscription option group doesn\'t exist').to.not.exist;
        const filterOptions = (0, _testHelpers.findAll)('[data-test-members-filter="0"] [data-test-select="members-filter"] option').map(option => option.value);
        (0, _chai.expect)(filterOptions).to.not.include('status');
        (0, _chai.expect)(filterOptions).to.not.include('subscriptions.plan_interval');
        (0, _chai.expect)(filterOptions).to.not.include('subscriptions.status');
      });
      it('hides email filters when email is disabled', async function () {
        // disable email
        this.server.db.settings.update({
          key: 'editor_default_email_recipients'
        }, {
          value: 'disabled'
        });
        this.server.createList('member', 10);
        await (0, _visit.visit)('/members');
        await (0, _testHelpers.click)('[data-test-button="members-filter-actions"]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-members-filter="0"] [data-test-select="members-filter"] optgroup[label="Email"]'), 'Email option group doesn\'t exist').to.not.exist;
        const filterOptions = (0, _testHelpers.findAll)('[data-test-members-filter="0"] [data-test-select="members-filter"] option').map(option => option.value);
        (0, _chai.expect)(filterOptions).to.not.include('email_count');
        (0, _chai.expect)(filterOptions).to.not.include('email_opened_count');
        (0, _chai.expect)(filterOptions).to.not.include('email_open_rate');
      });
    });
    describe('search', function () {
      beforeEach(function () {
        // specific member names+emails so search is deterministic
        // (default factory has random names+emails)
        this.server.create('member', {
          name: 'X',
          email: 'x@x.xxx'
        });
        this.server.create('member', {
          name: 'Y',
          email: 'y@y.yyy'
        });
        this.server.create('member', {
          name: 'Z',
          email: 'z@z.zzz'
        });
      });
      it('works', async function () {
        await (0, _visit.visit)('/members');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of initial member rows').to.equal(3);
        await (0, _testHelpers.fillIn)('[data-test-input="members-search"]', 'X'); // list updates

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of members matching "X"').to.equal(1); // URL reflects search

        (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/members?search=X'); // search input is active

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="members-search"]')).to.have.class('active'); // bulk actions become available

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="add-label-selected"]'), 'add label to selected button').to.exist;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="remove-label-selected"]'), 'remove label from selected button').to.exist;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="unsubscribe-selected"]'), 'unsubscribe selected button').to.exist;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="delete-selected"]'), 'delete selected button').to.exist; // clearing search returns us to starting state

        await (0, _testHelpers.fillIn)('[data-test-input="members-search"]', '');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of members after clearing search').to.equal(3);
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="members-search"]')).to.not.have.class('active');
      });
      it('populates from query param', async function () {
        await (0, _visit.visit)('/members?search=Y');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of initial member rows').to.equal(1);
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="members-search"]')).to.have.value('Y');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="members-search"]')).to.have.class('active');
      });
      it('has a no-match state', async function () {
        await (0, _visit.visit)('/members');
        await (0, _testHelpers.fillIn)('[data-test-input="members-search"]', 'unknown');
        (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/members?search=unknown'); // replaces members table with the no-matching members state

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-table="members"]')).to.not.exist;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-no-matching-members]')).to.exist; // search input is still shown

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="members-search"]')).to.be.visible;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="members-search"]')).to.have.class('active'); // export is disabled

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="export-members"]')).to.have.attribute('disabled'); // bulk actions are hidden

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="add-label-selected"]')).to.not.exist;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="remove-label-selected"]')).to.not.exist;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="unsubscribe-selected"]')).to.not.exist;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="delete-selected"]')).to.not.exist; // can clear the search

        await (0, _testHelpers.click)('[data-test-no-matching-members] [data-test-button="show-all-members"]');
        (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/members');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="members-search"]')).to.have.value('');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="members-search"]')).to.not.have.class('active');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length).to.equal(3);
      });
      it('can search + filter', async function () {
        this.server.create('member', {
          name: 'A',
          email: 'a@aaa.aaa',
          subscriptions: [this.server.create('subscription', {
            status: 'active'
          })]
        });
        await (0, _visit.visit)('/members');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of initial member rows').to.equal(4);
        await (0, _testHelpers.click)('[data-test-button="members-filter-actions"]');
        await (0, _testHelpers.fillIn)('[data-test-members-filter="0"] [data-test-select="members-filter"]', 'subscriptions.status');
        await (0, _testHelpers.fillIn)('[data-test-members-filter="0"] [data-test-select="members-filter-value"]', 'active');
        await (0, _testHelpers.click)('[data-test-button="members-apply-filter"]');
        await (0, _testHelpers.fillIn)('[data-test-input="members-search"]', 'a');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="members-list-item"]').length, '# of member rows after filter+search').to.equal(1); // filter is active and has # of filters

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="members-filter-actions"] span'), 'filter button').to.have.class('gh-btn-label-green');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="members-filter-actions"]'), 'filter button').to.contain.text('(1)'); // search input is active

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="members-search"]')).to.have.class('active');
      });
    });
  });
});
define("ghost-admin/tests/acceptance/members/import-test", ["miragejs", "ember-simple-auth/test-support", "@ember/test-helpers", "chai", "ghost-admin/tests/helpers/file-upload", "ember-mocha", "ember-cli-mirage/test-support", "ghost-admin/tests/helpers/visit"], function (_miragejs, _testSupport, _testHelpers, _chai, _fileUpload, _emberMocha, _testSupport2, _visit) {
  "use strict";

  describe('Acceptance: Members import', function () {
    let hooks = (0, _emberMocha.setupApplicationTest)();
    (0, _testSupport2.setupMirage)(hooks);
    beforeEach(async function () {
      this.server.loadFixtures('configs');
      let role = this.server.create('role', {
        name: 'Owner'
      });
      this.server.create('user', {
        roles: [role]
      });
      return await (0, _testSupport.authenticateSession)();
    });
    it('can open and close import modal', async function () {
      await (0, _visit.visit)('/members');
      await (0, _testHelpers.click)('[data-test-button="members-actions"]');
      await (0, _testHelpers.click)('[data-test-link="import-csv"]');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="import-members"]'), 'members import modal').to.exist;
      (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/members/import');
      await (0, _testHelpers.click)('[data-test-button="close-import-members"]');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="import-members"]'), 'members import modal').to.not.exist;
      (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/members');
    });
    it('has working happy path for small import with no mapper changes and Stripe not connected', async function () {
      await (0, _visit.visit)('/members/import');
      const csv = `email,name,note,subscribed_to_emails,labels,created_at
testemail@example.com,Test Email,This is a test template for importing your members list to Ghost,true,"vip,promotion",2019-10-30T14:52:08.000Z
`;
      await (0, _fileUpload.fileUpload)('[data-test-fileinput="members-csv"]', [csv], {
        name: 'members.csv',
        type: 'text/csv'
      });
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-csv-file-mapping]'), 'csv file mapper').to.exist;
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-members-import-table]'), 'csv file mapper').to.exist;
      (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-members-import-mapper]').length, '# of mapper rows').to.equal(6);
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="perform-import"]')).to.contain.text(' 1 ');
      await (0, _testHelpers.click)('[data-test-button="perform-import"]');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="import-members"]')).to.contain.text('Import complete');
      await (0, _testHelpers.click)('[data-test-button="close-import-members"]');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="import-members"]')).to.not.exist;
    });
    it('can assign labels in import mapper', async function () {
      const label1 = this.server.create('label');
      await (0, _visit.visit)('/members/import');
      const csv = `email,name,note,subscribed_to_emails,labels,created_at
testemail@example.com,Test Email,This is a test template for importing your members list to Ghost,true,"vip,promotion",2019-10-30T14:52:08.000Z
`;
      await (0, _fileUpload.fileUpload)('[data-test-fileinput="members-csv"]', [csv], {
        name: 'members.csv',
        type: 'text/csv'
      });
      const labelInput = '[data-test-csv-file-mapping] .gh-member-label-input';
      (0, _chai.expect)((0, _testHelpers.find)(labelInput), 'label input').to.exist;
      const dropdownContentId = (0, _testHelpers.find)(`${labelInput} .ember-basic-dropdown-trigger`).getAttribute('aria-owns');
      await (0, _testHelpers.click)(`${labelInput} .ember-basic-dropdown-trigger`);
      (0, _chai.expect)((0, _testHelpers.findAll)(`#${dropdownContentId} li.ember-power-select-option`).length, '# of label options').to.equal(1); // label input doesn't allow editing from the import modal

      (0, _chai.expect)((0, _testHelpers.findAll)(`#${dropdownContentId} [data-test-edit-label]`).length, '# of label edit buttons').to.equal(0);
      await (0, _testHelpers.click)((0, _testHelpers.find)(`#${dropdownContentId} li.ember-power-select-option`));
      (0, _chai.expect)((0, _testHelpers.findAll)(`${labelInput} .ember-power-select-multiple-options li`).length, '# of selected labels').to.equal(1);
      (0, _chai.expect)((0, _testHelpers.find)(`${labelInput} .ember-power-select-multiple-options li`)).to.contain.text(label1.name);
      let apiLabels = null;
      this.server.post('/members/upload/', function (_ref, request) {
        let {
          labels
        } = _ref;
        const label = labels.create();
        apiLabels = request.requestBody.get('labels');
        return new _miragejs.Response(201, {}, {
          meta: {
            import_label: label,
            stats: {
              imported: 1,
              invalid: []
            }
          }
        });
      });
      await (0, _testHelpers.click)('[data-test-button="perform-import"]');
      (0, _chai.expect)(apiLabels).to.equal(label1.name);
    });
  });
});
define("ghost-admin/tests/acceptance/offers-test", ["moment", "ember-simple-auth/test-support", "mocha", "@ember/test-helpers", "chai", "ember-mocha", "ember-cli-mirage/test-support", "ember-concurrency", "ghost-admin/tests/helpers/visit"], function (_moment, _testSupport, _mocha, _testHelpers, _chai, _emberMocha, _testSupport2, _emberConcurrency, _visit) {
  "use strict";

  (0, _mocha.describe)('Acceptance: Offers', function () {
    let hooks = (0, _emberMocha.setupApplicationTest)();
    (0, _testSupport2.setupMirage)(hooks);
    (0, _mocha.it)('redirects to signin when not authenticated', async function () {
      await (0, _testSupport.invalidateSession)();
      await (0, _visit.visit)('/offers');
      (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/signin');
    });
    (0, _mocha.it)('redirects non-admins to site', async function () {
      let role = this.server.create('role', {
        name: 'Editor'
      });
      this.server.create('user', {
        roles: [role]
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/offers');
      (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/site');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-nav="offers"]'), 'sidebar link').to.not.exist;
    });
    (0, _mocha.describe)('as owner', function () {
      (0, _mocha.beforeEach)(async function () {
        this.server.loadFixtures('tiers');
        let role = this.server.create('role', {
          name: 'Owner'
        });
        this.server.create('user', {
          roles: [role]
        });
        return await (0, _testSupport.authenticateSession)();
      });
      (0, _mocha.it)('it renders, can be navigated, can edit offer', async function () {
        const tier = this.server.create('tier');
        let offer1 = this.server.create('offer', {
          tier: {
            id: tier.id
          },
          createdAt: _moment.default.utc().subtract(1, 'day').valueOf()
        });
        this.server.create('offer', {
          tier: {
            id: tier.id
          },
          createdAt: _moment.default.utc().subtract(2, 'day').valueOf()
        });
        await (0, _visit.visit)('/offers');
        await (0, _testHelpers.settled)(); // lands on correct page

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/offers'); // it has correct page title

        (0, _chai.expect)(document.title, 'page title').to.equal('Offers - Test Blog'); // it lists all offers

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-list="offers-list-item"]').length, 'offers list count').to.equal(2);
        let offer = (0, _testHelpers.find)('[data-test-list="offers-list-item"]');
        (0, _chai.expect)(offer.querySelector('[data-test-list="offer-name"] h3').textContent, 'offer list item name').to.equal(offer1.name);
        await (0, _visit.visit)(`/offers/${offer1.id}`); // second wait is needed for the offer details to settle

        await (0, _testHelpers.settled)(); // it shows selected offer form

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="offer-name"]').value, 'loads correct offer into form').to.equal(offer1.name); // trigger save

        await (0, _testHelpers.fillIn)('[data-test-input="offer-name"]', 'New Name');
        await (0, _testHelpers.blur)('[data-test-input="offer-name"]');
        await (0, _testHelpers.click)('[data-test-button="save"]'); // extra timeout needed for Travis - sometimes it doesn't update
        // quick enough and an extra wait() call doesn't help

        await (0, _emberConcurrency.timeout)(100);
        await (0, _testHelpers.click)('[data-test-link="offers-back"]'); // lands on correct page

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/offers');
      });
    });
  });
});
define("ghost-admin/tests/acceptance/password-reset-test", ["@ember/test-helpers", "mocha", "chai", "ember-simple-auth/test-support", "ember-mocha", "ember-cli-mirage/test-support"], function (_testHelpers, _mocha, _chai, _testSupport, _emberMocha, _testSupport2) {
  "use strict";

  (0, _mocha.describe)('Acceptance: Password Reset', function () {
    let hooks = (0, _emberMocha.setupApplicationTest)();
    (0, _testSupport2.setupMirage)(hooks);
    (0, _mocha.describe)('request reset', function () {
      (0, _mocha.it)('is successful with valid data', async function () {
        await (0, _testSupport.invalidateSession)();
        await (0, _testHelpers.visit)('/signin');
        await (0, _testHelpers.fillIn)('input[name="identification"]', 'test@example.com');
        await (0, _testHelpers.click)('.forgotten-link'); // an alert with instructions is displayed

        (0, _chai.expect)((0, _testHelpers.findAll)('.gh-alert-blue').length, 'alert count').to.equal(1);
      });
      (0, _mocha.it)('shows error messages with invalid data', async function () {
        await (0, _testHelpers.visit)('/signin'); // no email provided

        await (0, _testHelpers.click)('.forgotten-link'); // email field is invalid

        (0, _chai.expect)((0, _testHelpers.find)('input[name="identification"]').closest('.form-group'), 'email field has error class (no email)').to.match('.error'); // password field is valid

        (0, _chai.expect)((0, _testHelpers.find)('input[name="password"]').closest('.form-group'), 'password field has error class (no email)').to.not.match('.error'); // error message shown

        (0, _chai.expect)((0, _testHelpers.find)('p.main-error').textContent.trim(), 'error message').to.equal('We need your email address to reset your password!'); // invalid email provided

        await (0, _testHelpers.fillIn)('input[name="identification"]', 'test');
        await (0, _testHelpers.click)('.forgotten-link'); // email field is invalid

        (0, _chai.expect)((0, _testHelpers.find)('input[name="identification"]').closest('.form-group'), 'email field has error class (invalid email)').to.match('.error'); // password field is valid

        (0, _chai.expect)((0, _testHelpers.find)('input[name="password"]').closest('.form-group'), 'password field has error class (invalid email)').to.not.match('.error'); // error message

        (0, _chai.expect)((0, _testHelpers.find)('p.main-error').textContent.trim(), 'error message').to.equal('We need your email address to reset your password!'); // unknown email provided

        await (0, _testHelpers.fillIn)('input[name="identification"]', 'unknown@example.com');
        await (0, _testHelpers.click)('.forgotten-link'); // email field is invalid

        (0, _chai.expect)((0, _testHelpers.find)('input[name="identification"]').closest('.form-group'), 'email field has error class (unknown email)').to.match('.error'); // password field is valid

        (0, _chai.expect)((0, _testHelpers.find)('input[name="password"]').closest('.form-group'), 'password field has error class (unknown email)').to.not.match('.error'); // error message

        (0, _chai.expect)((0, _testHelpers.find)('p.main-error').textContent.trim(), 'error message').to.equal('There is no user with that email address.');
      });
    }); // TODO: add tests for the change password screen
  });
});
define("ghost-admin/tests/acceptance/settings/amp-test", ["ghost-admin/utils/ctrl-or-cmd", "ember-simple-auth/test-support", "mocha", "@ember/test-helpers", "chai", "ember-mocha", "ember-cli-mirage/test-support", "ghost-admin/tests/helpers/visit"], function (_ctrlOrCmd, _testSupport, _mocha, _testHelpers, _chai, _emberMocha, _testSupport2, _visit) {
  "use strict";

  (0, _mocha.describe)('Acceptance: Settings - Integrations - AMP', function () {
    let hooks = (0, _emberMocha.setupApplicationTest)();
    (0, _testSupport2.setupMirage)(hooks);
    (0, _mocha.it)('redirects to signin when not authenticated', async function () {
      await (0, _testSupport.invalidateSession)();
      await (0, _visit.visit)('/settings/integrations/amp');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/signin');
    });
    (0, _mocha.it)('redirects to home page when authenticated as contributor', async function () {
      let role = this.server.create('role', {
        name: 'Contributor'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/settings/integrations/amp');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/posts');
    });
    (0, _mocha.it)('redirects to home page when authenticated as author', async function () {
      let role = this.server.create('role', {
        name: 'Author'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/settings/integrations/amp');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/site');
    });
    (0, _mocha.it)('redirects to home page when authenticated as editor', async function () {
      let role = this.server.create('role', {
        name: 'Editor'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/settings/integrations/amp');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/site');
    });
    (0, _mocha.describe)('when logged in', function () {
      (0, _mocha.beforeEach)(async function () {
        let role = this.server.create('role', {
          name: 'Administrator'
        });
        this.server.create('user', {
          roles: [role]
        });
        return await (0, _testSupport.authenticateSession)();
      });
      (0, _mocha.it)('it enables or disables AMP properly and saves it', async function () {
        await (0, _visit.visit)('/settings/integrations/amp'); // has correct url

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/integrations/amp'); // AMP is disabled by default

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-amp-checkbox]').checked, 'AMP checkbox').to.be.false;
        await (0, _testHelpers.click)('[data-test-amp-checkbox]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-amp-checkbox]').checked, 'AMP checkbox').to.be.true;
        await (0, _testHelpers.click)('[data-test-save-button]');
        let [lastRequest] = this.server.pretender.handledRequests.slice(-1);
        let params = JSON.parse(lastRequest.requestBody);
        (0, _chai.expect)(params.settings.findBy('key', 'amp').value).to.equal(true); // CMD-S shortcut works

        await (0, _testHelpers.click)('[data-test-amp-checkbox]');
        await (0, _testHelpers.triggerEvent)('.gh-app', 'keydown', {
          keyCode: 83,
          // s
          metaKey: _ctrlOrCmd.default === 'command',
          ctrlKey: _ctrlOrCmd.default === 'ctrl'
        }); // we've already saved in this test so there's no on-screen indication
        // that we've had another save, check the request was fired instead

        let [newRequest] = this.server.pretender.handledRequests.slice(-1);
        params = JSON.parse(newRequest.requestBody);
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-amp-checkbox]').checked, 'AMP checkbox').to.be.false;
        (0, _chai.expect)(params.settings.findBy('key', 'amp').value).to.equal(false);
      });
      (0, _mocha.it)('warns when leaving without saving', async function () {
        await (0, _visit.visit)('/settings/integrations/amp'); // has correct url

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/integrations/amp'); // AMP is disabled by default

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-amp-checkbox]').checked, 'AMP checkbox default').to.be.false;
        await (0, _testHelpers.click)('[data-test-amp-checkbox]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-amp-checkbox]').checked, 'AMP checkbox after click').to.be.true;
        await (0, _visit.visit)('/settings/staff');
        (0, _chai.expect)((0, _testHelpers.findAll)('.fullscreen-modal').length, 'unsaved changes modal exists').to.equal(1); // Leave without saving

        await (0, _testHelpers.click)('.fullscreen-modal [data-test-leave-button]');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL after leave without saving').to.equal('/settings/staff');
        await (0, _visit.visit)('/settings/integrations/amp');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL after return').to.equal('/settings/integrations/amp'); // settings were not saved

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-amp-checkbox]').checked, 'AMP checkbox').to.be.false;
      });
    });
  });
});
define("ghost-admin/tests/acceptance/settings/code-injection-test", ["ghost-admin/utils/ctrl-or-cmd", "ember-simple-auth/test-support", "mocha", "@ember/test-helpers", "chai", "ember-mocha", "ember-cli-mirage/test-support", "ghost-admin/tests/helpers/visit"], function (_ctrlOrCmd, _testSupport, _mocha, _testHelpers, _chai, _emberMocha, _testSupport2, _visit) {
  "use strict";

  (0, _mocha.describe)('Acceptance: Settings - Code-Injection', function () {
    let hooks = (0, _emberMocha.setupApplicationTest)();
    (0, _testSupport2.setupMirage)(hooks);
    (0, _mocha.it)('redirects to signin when not authenticated', async function () {
      await (0, _testSupport.invalidateSession)();
      await (0, _visit.visit)('/settings/code-injection');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/signin');
    });
    (0, _mocha.it)('redirects to home page when authenticated as contributor', async function () {
      let role = this.server.create('role', {
        name: 'Contributor'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/settings/code-injection');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/posts');
    });
    (0, _mocha.it)('redirects to staff page when authenticated as author', async function () {
      let role = this.server.create('role', {
        name: 'Author'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/settings/code-injection');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/site');
    });
    (0, _mocha.it)('redirects to home page when authenticated as editor', async function () {
      let role = this.server.create('role', {
        name: 'Editor'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/settings/code-injection');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/site');
    });
    (0, _mocha.describe)('when logged in', function () {
      (0, _mocha.beforeEach)(async function () {
        let role = this.server.create('role', {
          name: 'Administrator'
        });
        this.server.create('user', {
          roles: [role]
        });
        return await (0, _testSupport.authenticateSession)();
      });
      (0, _mocha.it)('it renders, loads and saves editors correctly', async function () {
        await (0, _visit.visit)('/settings/code-injection'); // has correct url

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/code-injection'); // has correct page title

        (0, _chai.expect)(document.title, 'page title').to.equal('Settings - Code injection - Test Blog');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-save-button]').textContent.trim(), 'save button text').to.equal('Save');
        (0, _chai.expect)((0, _testHelpers.findAll)('#ghost-head .CodeMirror').length, 'ghost head codemirror element').to.equal(1);
        (0, _chai.expect)((0, _testHelpers.find)('#ghost-head .CodeMirror'), 'ghost head editor theme').to.have.class('cm-s-xq-light');
        (0, _chai.expect)((0, _testHelpers.findAll)('#ghost-foot .CodeMirror').length, 'ghost head codemirror element').to.equal(1);
        (0, _chai.expect)((0, _testHelpers.find)('#ghost-foot .CodeMirror'), 'ghost head editor theme').to.have.class('cm-s-xq-light');
        await (0, _testHelpers.click)('[data-test-save-button]');
        let [lastRequest] = this.server.pretender.handledRequests.slice(-1);
        let params = JSON.parse(lastRequest.requestBody);
        (0, _chai.expect)(params.settings.findBy('key', 'codeinjection_head').value).to.equal(null);
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-save-button]').textContent.trim(), 'save button text').to.equal('Save'); // CMD-S shortcut works

        await (0, _testHelpers.triggerEvent)('.gh-app', 'keydown', {
          keyCode: 83,
          // s
          metaKey: _ctrlOrCmd.default === 'command',
          ctrlKey: _ctrlOrCmd.default === 'ctrl'
        }); // we've already saved in this test so there's no on-screen indication
        // that we've had another save, check the request was fired instead

        let [newRequest] = this.server.pretender.handledRequests.slice(-1);
        params = JSON.parse(newRequest.requestBody);
        (0, _chai.expect)(params.settings.findBy('key', 'codeinjection_head').value).to.equal(null);
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-save-button]').textContent.trim(), 'save button text').to.equal('Save');
      });
    });
  });
});
define("ghost-admin/tests/acceptance/settings/design-test", ["ember-simple-auth/test-support", "@ember/test-helpers", "chai", "ghost-admin/tests/helpers/file-upload", "ember-mocha", "ember-cli-mirage/test-support", "ghost-admin/tests/helpers/visit"], function (_testSupport, _testHelpers, _chai, _fileUpload, _emberMocha, _testSupport2, _visit) {
  "use strict";

  describe('Acceptance: Settings - Design', function () {
    let hooks = (0, _emberMocha.setupApplicationTest)();
    (0, _testSupport2.setupMirage)(hooks);
    beforeEach(async function () {
      let role = this.server.create('role', {
        name: 'Administrator'
      });
      this.server.create('user', {
        roles: [role]
      });
      this.server.loadFixtures('themes');
      return await (0, _testSupport.authenticateSession)();
    });
    it('redirects to signin when not authenticated', async function () {
      await (0, _testSupport.invalidateSession)();
      await (0, _visit.visit)('/settings/general');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/signin');
    });
    it('renders with no custom theme settings', async function () {
      await (0, _visit.visit)('/settings');
      await (0, _testHelpers.click)('[data-test-nav="design"]');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/design');
      (0, _chai.expect)(document.title, 'page title').to.equal('Settings - Design - Test Blog'); // side nav menu changes

      (0, _chai.expect)((0, _testHelpers.find)('[data-test-nav-menu="design"]'), 'design menu').to.exist;
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-nav-menu="main"]'), 'main menu').to.not.exist; // side nav defaults to general group open

      (0, _chai.expect)((0, _testHelpers.find)('[data-test-nav-toggle="general"]'), 'general toggle').to.exist;
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-nav-group="general"]'), 'general form').to.exist; // no other side nav groups exist

      (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-nav-toggle]'), 'no of group toggles').to.have.lengthOf(1);
      (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-nav-group]'), 'no of groups open').to.have.lengthOf(1); // current theme is shown in nav menu

      (0, _chai.expect)((0, _testHelpers.find)('[data-test-text="current-theme"]')).to.contain.text('casper - v1.0'); // defaults to "home" desktop preview

      (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="desktop-preview"]')).to.have.class('gh-btn-group-selected');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="mobile-preview"]')).to.not.have.class('gh-btn-group-selected');
    });
    it('has unsaved-changes confirmation', async function () {
      await (0, _visit.visit)('/settings/design');
      await (0, _testHelpers.fillIn)('[data-test-input="siteDescription"]', 'Changed');
      await (0, _testHelpers.click)('[data-test-link="back-to-settings"]');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="unsaved-settings"]')).to.exist;
      await (0, _testHelpers.click)('[data-test-modal="unsaved-settings"] [data-test-button="close"]');
      (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/settings/design');
      await (0, _testHelpers.click)('[data-test-link="back-to-settings"]');
      await (0, _testHelpers.click)('[data-test-modal="unsaved-settings"] [data-test-leave-button]');
      (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/settings');
      await (0, _testHelpers.click)('[data-test-nav="design"]');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="siteDescription"]')).to.not.have.value('Changed');
    });
    it('renders with custom theme settings');
    it('can install an official theme', async function () {
      await (0, _visit.visit)('/settings/design');
      await (0, _testHelpers.click)('[data-test-nav="change-theme"]');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/design/change-theme');
      await (0, _testHelpers.click)('[data-test-theme-link="Journal"]');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/design/change-theme/Journal');
      await (0, _testHelpers.click)('[data-test-button="install-theme"]');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="install-theme"]'), 'install-theme modal').to.exist;
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-state="confirm"]'), 'confirm state').to.exist;
      (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-state]').length, 'state count').to.equal(1);
      await (0, _testHelpers.click)('[data-test-button="confirm-install"]');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-state="installed-no-notes"]'), 'success state').to.exist;
      (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-state]').length, 'state count').to.equal(1); // navigates back to design screen in background

      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/design');
      await (0, _testHelpers.click)('[data-test-button="cancel"]');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="install-theme"]')).to.not.exist; // nav menu shows current theme

      (0, _chai.expect)((0, _testHelpers.find)('[data-test-text="current-theme"]')).to.contain.text('Journal - v0.1');
    });
    it('can upload custom theme', async function () {
      this.server.post('/themes/upload/', function (_ref) {
        let {
          themes
        } = _ref;
        const theme = themes.create({
          name: 'custom',
          package: {
            name: 'Custom',
            version: '1.0'
          }
        });
        return {
          themes: [theme]
        };
      });
      await (0, _visit.visit)('/settings/design/change-theme');
      await (0, _testHelpers.click)('[data-test-button="upload-theme"]');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="upload-theme"]'), 'upload-theme modal').to.exist;
      await (0, _fileUpload.fileUpload)('[data-test-modal="upload-theme"] input[type="file"]', ['test'], {
        name: 'valid-theme.zip',
        type: 'application/zip'
      });
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-state="installed-no-notes"]'), 'success state').to.exist;
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'url after upload').to.equal('/settings/design/change-theme');
      await (0, _testHelpers.click)('[data-test-button="activate"]');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'url after activate').to.equal('/settings/design');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="install-theme"]')).to.not.exist;
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-text="current-theme"]')).to.contain.text('custom - v1.0');
    });
    it('can change between installed themes');
    it('can delete installed theme');
    describe('limits', function () {
      it('displays upgrade notice when custom themes are not allowed', async function () {
        this.server.loadFixtures('configs');
        const config = this.server.db.configs.find(1);
        config.hostSettings = {
          limits: {
            customThemes: {
              allowlist: ['casper', 'dawn', 'lyra'],
              error: 'All our official built-in themes are available the Starter plan, if you upgrade to one of our higher tiers you will also be able to edit and upload custom themes for your site.'
            }
          }
        };
        this.server.db.configs.update(1, config);
        await (0, _visit.visit)('/settings/design/change-theme');
        await (0, _testHelpers.click)('[data-test-button="upload-theme"]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="limits/custom-theme"]'), 'limits/custom-theme modal').to.exist;
      });
    });
  });
});
define("ghost-admin/tests/acceptance/settings/general-test", ["ghost-admin/utils/ctrl-or-cmd", "ember-simple-auth/test-support", "mocha", "@ember/test-helpers", "chai", "ember-mocha", "ember-cli-mirage/test-support", "ghost-admin/tests/helpers/visit"], function (_ctrlOrCmd, _testSupport, _mocha, _testHelpers, _chai, _emberMocha, _testSupport2, _visit) {
  "use strict";

  (0, _mocha.describe)('Acceptance: Settings - General', function () {
    let hooks = (0, _emberMocha.setupApplicationTest)();
    (0, _testSupport2.setupMirage)(hooks);
    (0, _mocha.it)('redirects to signin when not authenticated', async function () {
      await (0, _testSupport.invalidateSession)();
      await (0, _visit.visit)('/settings/general');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/signin');
    });
    (0, _mocha.it)('redirects to home page when authenticated as contributor', async function () {
      let role = this.server.create('role', {
        name: 'Contributor'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/settings/general');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/posts');
    });
    (0, _mocha.it)('redirects to home page when authenticated as author', async function () {
      let role = this.server.create('role', {
        name: 'Author'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/settings/general');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/site');
    });
    (0, _mocha.it)('redirects to home page when authenticated as editor', async function () {
      let role = this.server.create('role', {
        name: 'Editor'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/settings/general');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/site');
    });
    (0, _mocha.describe)('when logged in', function () {
      (0, _mocha.beforeEach)(async function () {
        let role = this.server.create('role', {
          name: 'Administrator'
        });
        this.server.create('user', {
          roles: [role]
        });
        return await (0, _testSupport.authenticateSession)();
      });
      (0, _mocha.it)('it renders, handles image uploads', async function () {
        await (0, _visit.visit)('/settings/general'); // has correct url

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/general'); // has correct page title

        (0, _chai.expect)(document.title, 'page title').to.equal('Settings - General - Test Blog'); // highlights nav menu

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-nav="settings"]'), 'highlights nav menu item').to.have.class('active');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="save"]').textContent.trim(), 'save button text').to.equal('Save');
        await (0, _testHelpers.click)('[data-test-toggle-pub-info]');
        await (0, _testHelpers.fillIn)('[data-test-title-input]', 'New Blog Title');
        await (0, _testHelpers.click)('[data-test-button="save"]');
        (0, _chai.expect)(document.title, 'page title').to.equal('Settings - General - New Blog Title'); // CMD-S shortcut works
        // -------------------------------------------------------------- //

        await (0, _testHelpers.fillIn)('[data-test-title-input]', 'CMD-S Test');
        await (0, _testHelpers.triggerEvent)('.gh-app', 'keydown', {
          keyCode: 83,
          // s
          metaKey: _ctrlOrCmd.default === 'command',
          ctrlKey: _ctrlOrCmd.default === 'ctrl'
        }); // we've already saved in this test so there's no on-screen indication
        // that we've had another save, check the request was fired instead

        let [lastRequest] = this.server.pretender.handledRequests.slice(-1);
        let params = JSON.parse(lastRequest.requestBody);
        (0, _chai.expect)(params.settings.findBy('key', 'title').value).to.equal('CMD-S Test');
      });
      (0, _mocha.it)('renders timezone selector correctly', async function () {
        await (0, _visit.visit)('/settings/general');
        await (0, _testHelpers.click)('[data-test-toggle-timezone]');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/general');
        (0, _chai.expect)((0, _testHelpers.findAll)('#timezone option').length, 'available timezones').to.equal(66);
        (0, _chai.expect)((0, _testHelpers.find)('#timezone option:checked').textContent.trim()).to.equal('(GMT) UTC');
        (0, _testHelpers.find)('#timezone option[value="Africa/Cairo"]').selected = true;
        await (0, _testHelpers.triggerEvent)('#timezone', 'change');
        await (0, _testHelpers.click)('[data-test-button="save"]');
        (0, _chai.expect)((0, _testHelpers.find)('#timezone option:checked').textContent.trim()).to.equal('(GMT +2:00) Cairo, Egypt');
      });
      (0, _mocha.it)('handles private blog settings correctly', async function () {
        await (0, _visit.visit)('/settings/general'); // handles private blog settings correctly

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-private-checkbox]').checked, 'isPrivate checkbox').to.be.false;
        await (0, _testHelpers.click)('[data-test-private-checkbox]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-private-checkbox]').checked, 'isPrivate checkbox').to.be.true;
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-password-input]').length, 'password input').to.equal(1);
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-password-input]').value, 'password default value').to.not.equal('');
        await (0, _testHelpers.fillIn)('[data-test-password-input]', '');
        await (0, _testHelpers.blur)('[data-test-password-input]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-password-error]').textContent.trim(), 'empty password error').to.equal('Password must be supplied');
        await (0, _testHelpers.fillIn)('[data-test-password-input]', 'asdfg');
        await (0, _testHelpers.blur)('[data-test-password-input]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-password-error]').textContent.trim(), 'present password error').to.equal('');
      });
      (0, _mocha.it)('handles social blog settings correctly', async function () {
        let testSocialInput = async function (type, input, expectedValue) {
          let expectedError = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : '';
          await (0, _testHelpers.fillIn)(`[data-test-${type}-input]`, input);
          await (0, _testHelpers.blur)(`[data-test-${type}-input]`);
          (0, _chai.expect)((0, _testHelpers.find)(`[data-test-${type}-input]`).value, `${type} value for ${input}`).to.equal(expectedValue);
          (0, _chai.expect)((0, _testHelpers.find)(`[data-test-${type}-error]`).textContent.trim(), `${type} validation response for ${input}`).to.equal(expectedError);
          (0, _chai.expect)((0, _testHelpers.find)(`[data-test-${type}-input]`).closest('.form-group').classList.contains('error'), `${type} input should be in error state with '${input}'`).to.equal(!!expectedError);
        };

        let testFacebookValidation = async function () {
          for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }

          return testSocialInput('facebook', ...args);
        };

        let testTwitterValidation = async function () {
          for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
            args[_key2] = arguments[_key2];
          }

          return testSocialInput('twitter', ...args);
        };

        await (0, _visit.visit)('/settings/general');
        await (0, _testHelpers.click)('[data-test-toggle-social]'); // validates a facebook url correctly
        // loads fixtures and performs transform

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-facebook-input]').value, 'initial facebook value').to.equal('https://www.facebook.com/test');
        await (0, _testHelpers.focus)('[data-test-facebook-input]');
        await (0, _testHelpers.blur)('[data-test-facebook-input]'); // regression test: we still have a value after the input is
        // focused and then blurred without any changes

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-facebook-input]').value, 'facebook value after blur with no change').to.equal('https://www.facebook.com/test');
        await testFacebookValidation('facebook.com/username', 'https://www.facebook.com/username');
        await testFacebookValidation('testuser', 'https://www.facebook.com/testuser');
        await testFacebookValidation('ab99', 'https://www.facebook.com/ab99');
        await testFacebookValidation('page/ab99', 'https://www.facebook.com/page/ab99');
        await testFacebookValidation('page/*(&*(%%))', 'https://www.facebook.com/page/*(&*(%%))');
        await testFacebookValidation('facebook.com/pages/some-facebook-page/857469375913?ref=ts', 'https://www.facebook.com/pages/some-facebook-page/857469375913?ref=ts');
        await testFacebookValidation('https://www.facebook.com/groups/savethecrowninn', 'https://www.facebook.com/groups/savethecrowninn');
        await testFacebookValidation('http://github.com/username', 'http://github.com/username', 'The URL must be in a format like https://www.facebook.com/yourPage');
        await testFacebookValidation('http://github.com/pages/username', 'http://github.com/pages/username', 'The URL must be in a format like https://www.facebook.com/yourPage'); // validates a twitter url correctly
        // loads fixtures and performs transform

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-twitter-input]').value, 'initial twitter value').to.equal('https://twitter.com/test');
        await (0, _testHelpers.focus)('[data-test-twitter-input]');
        await (0, _testHelpers.blur)('[data-test-twitter-input]'); // regression test: we still have a value after the input is
        // focused and then blurred without any changes

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-twitter-input]').value, 'twitter value after blur with no change').to.equal('https://twitter.com/test');
        await testTwitterValidation('twitter.com/username', 'https://twitter.com/username');
        await testTwitterValidation('testuser', 'https://twitter.com/testuser');
        await testTwitterValidation('http://github.com/username', 'https://twitter.com/username');
        await testTwitterValidation('*(&*(%%))', '*(&*(%%))', 'The URL must be in a format like https://twitter.com/yourUsername');
        await testTwitterValidation('thisusernamehasmorethan15characters', 'thisusernamehasmorethan15characters', 'Your Username is not a valid Twitter Username');
      });
      (0, _mocha.it)('warns when leaving without saving', async function () {
        await (0, _visit.visit)('/settings/general');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-private-checkbox]').checked, 'private blog checkbox').to.be.false;
        await (0, _testHelpers.click)('[data-test-toggle-pub-info]');
        await (0, _testHelpers.fillIn)('[data-test-title-input]', 'New Blog Title');
        await (0, _testHelpers.click)('[data-test-private-checkbox]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-private-checkbox]').checked, 'private blog checkbox').to.be.true;
        await (0, _visit.visit)('/settings/staff');
        (0, _chai.expect)((0, _testHelpers.findAll)('.fullscreen-modal').length, 'modal exists').to.equal(1); // Leave without saving

        await (0, _testHelpers.click)('.fullscreen-modal [data-test-leave-button]');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/staff');
        await (0, _visit.visit)('/settings/general');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/general'); // settings were not saved

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-private-checkbox]').checked, 'private blog checkbox').to.be.false;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-title-input]').textContent.trim(), 'Blog title').to.equal('');
      });
    });
  });
});
define("ghost-admin/tests/acceptance/settings/integrations-test", ["ember-simple-auth/test-support", "mocha", "@ember/test-helpers", "chai", "ember-mocha", "ember-cli-mirage/test-support", "ghost-admin/tests/helpers/visit"], function (_testSupport, _mocha, _testHelpers, _chai, _emberMocha, _testSupport2, _visit) {
  "use strict";

  (0, _mocha.describe)('Acceptance: Settings - Integrations - Custom', function () {
    let hooks = (0, _emberMocha.setupApplicationTest)();
    (0, _testSupport2.setupMirage)(hooks);
    (0, _mocha.describe)('access permissions', function () {
      (0, _mocha.beforeEach)(function () {
        this.server.create('integration', {
          name: 'Test'
        });
      });
      (0, _mocha.it)('redirects /integrations/ to signin when not authenticated', async function () {
        await (0, _testSupport.invalidateSession)();
        await (0, _visit.visit)('/settings/integrations');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/signin');
      });
      (0, _mocha.it)('redirects /integrations/ to home page when authenticated as contributor', async function () {
        let role = this.server.create('role', {
          name: 'Contributor'
        });
        this.server.create('user', {
          roles: [role],
          slug: 'test-user'
        });
        await (0, _testSupport.authenticateSession)();
        await (0, _visit.visit)('/settings/integrations');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/posts');
      });
      (0, _mocha.it)('redirects /integrations/ to home page when authenticated as author', async function () {
        let role = this.server.create('role', {
          name: 'Author'
        });
        this.server.create('user', {
          roles: [role],
          slug: 'test-user'
        });
        await (0, _testSupport.authenticateSession)();
        await (0, _visit.visit)('/settings/integrations');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/site');
      });
      (0, _mocha.it)('redirects /integrations/ to home page when authenticated as editor', async function () {
        let role = this.server.create('role', {
          name: 'Editor'
        });
        this.server.create('user', {
          roles: [role],
          slug: 'test-user'
        });
        await (0, _testSupport.authenticateSession)();
        await (0, _visit.visit)('/settings/integrations/1');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/site');
      });
      (0, _mocha.it)('redirects /integrations/:id/ to signin when not authenticated', async function () {
        await (0, _testSupport.invalidateSession)();
        await (0, _visit.visit)('/settings/integrations/1');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/signin');
      });
      (0, _mocha.it)('redirects /integrations/:id/ to home page when authenticated as contributor', async function () {
        let role = this.server.create('role', {
          name: 'Contributor'
        });
        this.server.create('user', {
          roles: [role],
          slug: 'test-user'
        });
        await (0, _testSupport.authenticateSession)();
        await (0, _visit.visit)('/settings/integrations/1');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/posts');
      });
      (0, _mocha.it)('redirects /integrations/:id/ to home page when authenticated as author', async function () {
        let role = this.server.create('role', {
          name: 'Author'
        });
        this.server.create('user', {
          roles: [role],
          slug: 'test-user'
        });
        await (0, _testSupport.authenticateSession)();
        await (0, _visit.visit)('/settings/integrations/1');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/site');
      });
      (0, _mocha.it)('redirects /integrations/:id/ to home page when authenticated as editor', async function () {
        let role = this.server.create('role', {
          name: 'Editor'
        });
        this.server.create('user', {
          roles: [role],
          slug: 'test-user'
        });
        await (0, _testSupport.authenticateSession)();
        await (0, _visit.visit)('/settings/integrations/1');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/site');
      });
    });
    (0, _mocha.describe)('navigation', function () {
      (0, _mocha.beforeEach)(async function () {
        this.server.loadFixtures('settings');
        let role = this.server.create('role', {
          name: 'Administrator'
        });
        this.server.create('user', {
          roles: [role]
        });
        return await (0, _testSupport.authenticateSession)();
      });
      (0, _mocha.it)('renders defaults correctly', async function () {
        await (0, _visit.visit)('/settings/integrations'); // slack is not configured in the fixtures

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-app="slack"] [data-test-app-status]').textContent.trim(), 'slack app status').to.equal('Configure'); // amp is disabled in the fixtures

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-app="amp"] [data-test-app-status]').textContent.trim(), 'amp app status').to.equal('Configure');
      });
      (0, _mocha.it)('renders AMP active state', async function () {
        this.server.db.settings.update({
          key: 'amp',
          value: true
        });
        await (0, _visit.visit)('/settings/integrations'); // amp switches to active when enabled

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-app="amp"] [data-test-app-status]').textContent.trim(), 'amp app status').to.equal('Active');
      });
      (0, _mocha.it)('it redirects to Slack when clicking on the grid', async function () {
        await (0, _visit.visit)('/settings/integrations'); // has correct url

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/integrations');
        await (0, _testHelpers.click)('[data-test-link="slack"]'); // has correct url

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/integrations/slack');
      });
      (0, _mocha.it)('it redirects to AMP when clicking on the grid', async function () {
        await (0, _visit.visit)('/settings/integrations'); // has correct url

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/integrations');
        await (0, _testHelpers.click)('[data-test-link="amp"]'); // has correct url

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/integrations/amp');
      });
      (0, _mocha.it)('it redirects to Unsplash when clicking on the grid', async function () {
        await (0, _visit.visit)('/settings/integrations'); // has correct url

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/integrations');
        await (0, _testHelpers.click)('[data-test-link="unsplash"]'); // has correct url

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/integrations/unsplash');
      });
    });
    (0, _mocha.describe)('custom integrations', function () {
      (0, _mocha.beforeEach)(async function () {
        this.server.loadFixtures('configs');
        let config = this.server.schema.configs.first();
        config.update({
          enableDeveloperExperiments: true
        });
        let role = this.server.create('role', {
          name: 'Administrator'
        });
        this.server.create('user', {
          roles: [role]
        });
        return await (0, _testSupport.authenticateSession)();
      });
      (0, _mocha.it)('handles 404', async function () {
        await (0, _visit.visit)('/settings/integrations/1');
        (0, _chai.expect)((0, _testHelpers.currentRouteName)()).to.equal('error404');
      });
      (0, _mocha.it)('can add new integration', async function () {
        // sanity check
        (0, _chai.expect)(this.server.db.integrations.length, 'number of integrations in db at start').to.equal(0);
        (0, _chai.expect)(this.server.db.apiKeys.length, 'number of apiKeys in db at start').to.equal(0); // blank slate

        await (0, _visit.visit)('/settings/integrations');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-blank="custom-integrations"]'), 'initial blank slate').to.exist; // new integration modal opens/closes

        await (0, _testHelpers.click)('[data-test-button="new-integration"]');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'url after clicking new').to.equal('/settings/integrations/new');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="new-integration"]'), 'modal after clicking new').to.exist;
        await (0, _testHelpers.click)('[data-test-button="cancel-new-integration"]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="new-integration"]'), 'modal after clicking cancel').to.not.exist;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-blank="custom-integrations"]'), 'blank slate after cancelled creation').to.exist; // new integration validations

        await (0, _testHelpers.click)('[data-test-button="new-integration"]');
        await (0, _testHelpers.click)('[data-test-button="create-integration"]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="new-integration-name"]').textContent, 'name error after create with blank field').to.have.string('enter a name');
        await (0, _testHelpers.fillIn)('[data-test-input="new-integration-name"]', 'Duplicate');
        await (0, _testHelpers.click)('[data-test-button="create-integration"]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="new-integration-name"]').textContent, 'name error after create with duplicate name').to.have.string('already been used'); // successful creation

        await (0, _testHelpers.fillIn)('[data-test-input="new-integration-name"]', 'Test');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="new-integration-name"]').textContent.trim(), 'name error after typing in field').to.be.empty;
        await (0, _testHelpers.click)('[data-test-button="create-integration"]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="new-integration"]'), 'modal after successful create').to.not.exist;
        (0, _chai.expect)(this.server.db.integrations.length, 'number of integrations in db after create').to.equal(1); // mirage sanity check

        (0, _chai.expect)(this.server.db.apiKeys.length, 'number of api keys in db after create').to.equal(2);
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'url after integration creation').to.equal('/settings/integrations/1'); // test navigation back to list then back to new integration

        await (0, _testHelpers.click)('[data-test-link="integrations-back"]');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'url after clicking "Back"').to.equal('/settings/integrations');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-blank="custom-integrations"]'), 'blank slate after creation').to.not.exist;
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-custom-integration]').length, 'number of custom integrations after creation').to.equal(1);
        await (0, _testHelpers.click)(`[data-test-integration="1"]`);
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'url after clicking integration in list').to.equal('/settings/integrations/1');
      });
      (0, _mocha.it)('can manage an integration', async function () {
        this.server.create('integration');
        await (0, _visit.visit)('/settings/integrations/1');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'initial URL').to.equal('/settings/integrations/1');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-screen-title]').textContent, 'screen title').to.have.string('Integration 1'); // fields have expected values
        // TODO: add test for logo

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="name"]').value, 'initial name value').to.equal('Integration 1');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="description"]').value, 'initial description value').to.equal('');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-text="content-key"]'), 'content key text').to.have.trimmed.text('integration-1_content_key-12345');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-text="admin-key"]'), 'admin key text').to.have.trimmed.text('integration-1_admin_key-12345');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-text="api-url"]'), 'api url text').to.have.trimmed.text(window.location.origin); // it can modify integration fields and has validation

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="name"]').textContent.trim(), 'initial name error').to.be.empty;
        await (0, _testHelpers.fillIn)('[data-test-input="name"]', '');
        await await (0, _testHelpers.blur)('[data-test-input="name"]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="name"]').textContent, 'name validation for blank string').to.have.string('enter a name');
        await (0, _testHelpers.click)('[data-test-button="save"]');
        (0, _chai.expect)(this.server.schema.integrations.first().name, 'db integration name after failed save').to.equal('Integration 1');
        await (0, _testHelpers.fillIn)('[data-test-input="name"]', 'Test Integration');
        await await (0, _testHelpers.blur)('[data-test-input="name"]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="name"]').textContent.trim(), 'name error after valid entry').to.be.empty;
        await (0, _testHelpers.fillIn)('[data-test-input="description"]', 'Description for Test Integration');
        await await (0, _testHelpers.blur)('[data-test-input="description"]');
        await (0, _testHelpers.click)('[data-test-button="save"]'); // changes are reflected in the integrations list

        await (0, _testHelpers.click)('[data-test-link="integrations-back"]');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'url after saving and clicking "back"').to.equal('/settings/integrations');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-integration="1"] [data-test-text="name"]').textContent.trim(), 'integration name after save').to.equal('Test Integration');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-integration="1"] [data-test-text="description"]').textContent.trim(), 'integration description after save').to.equal('Description for Test Integration');
        await (0, _testHelpers.click)('[data-test-integration="1"]'); // warns of unsaved changes when leaving

        await (0, _testHelpers.fillIn)('[data-test-input="name"]', 'Unsaved test');
        await (0, _testHelpers.click)('[data-test-link="integrations-back"]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="unsaved-settings"]'), 'modal shown when navigating with unsaved changes').to.exist;
        await (0, _testHelpers.click)('[data-test-stay-button]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="unsaved-settings"]'), 'modal is closed after clicking "stay"').to.not.exist;
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'url after clicking "stay"').to.equal('/settings/integrations/1');
        await (0, _testHelpers.click)('[data-test-link="integrations-back"]');
        await (0, _testHelpers.click)('[data-test-leave-button]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="unsaved-settings"]'), 'modal is closed after clicking "leave"').to.not.exist;
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'url after clicking "leave"').to.equal('/settings/integrations');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-integration="1"] [data-test-text="name"]').textContent.trim(), 'integration name after leaving unsaved changes').to.equal('Test Integration');
      });
      (0, _mocha.it)('can manage an integration\'s webhooks', async function () {
        this.server.create('integration');
        await (0, _visit.visit)('/settings/integrations/1');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-webhooks-blank-slate]')).to.exist; // open new webhook modal

        await (0, _testHelpers.click)('[data-test-link="add-webhook"]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="webhook-form"]')).to.exist;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="webhook-form"] [data-test-text="title"]').textContent).to.have.string('New webhook'); // can cancel new webhook

        await (0, _testHelpers.click)('[data-test-button="cancel-webhook"]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="webhook-form"]')).to.not.exist; // create new webhook

        await (0, _testHelpers.click)('[data-test-link="add-webhook"]');
        await (0, _testHelpers.fillIn)('[data-test-input="webhook-name"]', 'First webhook');
        await (0, _testHelpers.fillIn)('[data-test-select="webhook-event"]', 'site.changed');
        await (0, _testHelpers.fillIn)('[data-test-input="webhook-targetUrl"]', 'https://example.com/first-webhook');
        await (0, _testHelpers.click)('[data-test-button="save-webhook"]'); // modal closed and 1 webhook listed with correct details

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="webhook-form"]')).to.not.exist;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-webhook-row]')).to.exist;
        let row = (0, _testHelpers.find)('[data-test-webhook-row="1"]');
        (0, _chai.expect)(row.querySelector('[data-test-text="name"]').textContent).to.have.string('First webhook');
        (0, _chai.expect)(row.querySelector('[data-test-text="event"]').textContent).to.have.string('Site changed (rebuild)');
        (0, _chai.expect)(row.querySelector('[data-test-text="targetUrl"]').textContent).to.have.string('https://example.com/first-webhook');
        (0, _chai.expect)(row.querySelector('[data-test-text="last-triggered"]').textContent).to.have.string('Not triggered'); // click edit webhook link

        await (0, _testHelpers.click)('[data-test-webhook-row="1"] [data-test-link="edit-webhook"]'); // modal appears and has correct title

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="webhook-form"]')).to.exist;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="webhook-form"] [data-test-text="title"]').textContent).to.have.string('Edit webhook');
      }); // test to ensure the `value=description` passed to `gh-text-input` is `readonly`

      (0, _mocha.it)('doesn\'t show unsaved changes modal after placing focus on description field', async function () {
        this.server.create('integration');
        await (0, _visit.visit)('/settings/integrations/1');
        await (0, _testHelpers.click)('[data-test-input="description"]');
        await await (0, _testHelpers.blur)('[data-test-input="description"]');
        await (0, _testHelpers.click)('[data-test-link="integrations-back"]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="unsaved-settings"]'), 'unsaved changes modal is not shown').to.not.exist;
        (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/settings/integrations');
      });
    });
  });
});
define("ghost-admin/tests/acceptance/settings/labs-test", ["ember-simple-auth/test-support", "mocha", "@ember/test-helpers", "chai", "ghost-admin/tests/helpers/file-upload", "ember-mocha", "ember-cli-mirage/test-support", "ghost-admin/tests/helpers/visit"], function (_testSupport, _mocha, _testHelpers, _chai, _fileUpload, _emberMocha, _testSupport2, _visit) {
  "use strict";

  // import wait from 'ember-test-helpers/wait';
  // import {timeout} from 'ember-concurrency';
  (0, _mocha.describe)('Acceptance: Settings - Labs', function () {
    let hooks = (0, _emberMocha.setupApplicationTest)();
    (0, _testSupport2.setupMirage)(hooks);
    (0, _mocha.it)('redirects to signin when not authenticated', async function () {
      await (0, _testSupport.invalidateSession)();
      await (0, _visit.visit)('/settings/labs');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/signin');
    });
    (0, _mocha.it)('redirects to home page when authenticated as contributor', async function () {
      let role = this.server.create('role', {
        name: 'Contributor'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/settings/labs');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/posts');
    });
    (0, _mocha.it)('redirects to home page when authenticated as author', async function () {
      let role = this.server.create('role', {
        name: 'Author'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/settings/labs');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/site');
    });
    (0, _mocha.it)('redirects to home page when authenticated as editor', async function () {
      let role = this.server.create('role', {
        name: 'Editor'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/settings/labs');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/site');
    });
    (0, _mocha.describe)('when logged in', function () {
      (0, _mocha.beforeEach)(async function () {
        let role = this.server.create('role', {
          name: 'Administrator'
        });
        this.server.create('user', {
          roles: [role]
        });
        return await (0, _testSupport.authenticateSession)();
      });

      _mocha.it.skip('it renders, loads modals correctly', async function () {
        await (0, _visit.visit)('/settings/labs'); // has correct url

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/labs'); // has correct page title

        (0, _chai.expect)(document.title, 'page title').to.equal('Settings - Labs - Test Blog'); // highlights nav menu

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-nav="labs"]'), 'highlights nav menu item').to.have.class('active');
        await (0, _testHelpers.click)('#settings-resetdb .js-delete');
        (0, _chai.expect)((0, _testHelpers.findAll)('.fullscreen-modal .modal-content').length, 'modal element').to.equal(1);
        await (0, _testHelpers.click)('.fullscreen-modal .modal-footer .gh-btn');
        (0, _chai.expect)((0, _testHelpers.findAll)('.fullscreen-modal').length, 'modal element').to.equal(0);
      });

      (0, _mocha.it)('can upload/download redirects', async function () {
        await (0, _visit.visit)('/settings/labs'); // successful upload

        this.server.post('/redirects/upload/', {}, 200);
        await (0, _fileUpload.fileUpload)('[data-test-file-input="redirects"] input', ['test'], {
          name: 'redirects.json',
          type: 'application/json'
        }); // TODO: tests for the temporary success/failure state have been
        // disabled because they were randomly failing
        // this should be half-way through button reset timeout
        // await timeout(50);
        //
        // // shows success button
        // let buttons = findAll('[data-test-button="upload-redirects"]');
        // expect(buttons.length, 'no of success buttons').to.equal(1);
        // expect(
        //     buttons[0],
        //     'success button is green'
        // ).to.have.class('gh-btn-green);
        // expect(
        //     button.textContent,
        //     'success button text'
        // ).to.have.string('Uploaded');
        //
        // await wait();
        // returned to normal button

        let buttons = (0, _testHelpers.findAll)('[data-test-button="upload-redirects"]');
        (0, _chai.expect)(buttons.length, 'no of post-success buttons').to.equal(1);
        (0, _chai.expect)(buttons[0], 'post-success button doesn\'t have success class').to.not.have.class('gh-btn-green');
        (0, _chai.expect)(buttons[0].textContent, 'post-success button text').to.have.string('Upload redirects'); // failed upload

        this.server.post('/redirects/upload/', {
          errors: [{
            type: 'BadRequestError',
            message: 'Test failure message'
          }]
        }, 400);
        await (0, _fileUpload.fileUpload)('[data-test-file-input="redirects"] input', ['test'], {
          name: 'redirects-bad.json',
          type: 'application/json'
        }); // TODO: tests for the temporary success/failure state have been
        // disabled because they were randomly failing
        // this should be half-way through button reset timeout
        // await timeout(50);
        //
        // shows failure button
        // buttons = findAll('[data-test-button="upload-redirects"]');
        // expect(buttons.length, 'no of failure buttons').to.equal(1);
        // expect(
        //     buttons[0],
        //     'failure button is red'
        // ).to.have.class('gh-btn-red);
        // expect(
        //     buttons[0].textContent,
        //     'failure button text'
        // ).to.have.string('Upload Failed');
        //
        // await wait();
        // shows error message

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="redirects"]').textContent.trim(), 'upload error text').to.have.string('Test failure message'); // returned to normal button

        buttons = (0, _testHelpers.findAll)('[data-test-button="upload-redirects"]');
        (0, _chai.expect)(buttons.length, 'no of post-failure buttons').to.equal(1);
        (0, _chai.expect)(buttons[0], 'post-failure button doesn\'t have failure class').to.not.have.class('gh-btn-red');
        (0, _chai.expect)(buttons[0].textContent, 'post-failure button text').to.have.string('Upload redirects'); // successful upload clears error

        this.server.post('/redirects/upload/', {}, 200);
        await (0, _fileUpload.fileUpload)('[data-test-file-input="redirects"] input', ['test'], {
          name: 'redirects-bad.json',
          type: 'application/json'
        });
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="redirects"]')).to.not.exist; // can download redirects.json

        await (0, _testHelpers.click)('[data-test-link="download-redirects"]');
        let iframe = document.querySelector('#iframeDownload');
        (0, _chai.expect)(iframe.getAttribute('src')).to.have.string('/redirects/download/');
      });
      (0, _mocha.it)('can upload/download routes.yaml', async function () {
        await (0, _visit.visit)('/settings/labs'); // successful upload

        this.server.post('/settings/routes/yaml/', {}, 200);
        await (0, _fileUpload.fileUpload)('[data-test-file-input="routes"] input', ['test'], {
          name: 'routes.yaml',
          type: 'application/x-yaml'
        }); // TODO: tests for the temporary success/failure state have been
        // disabled because they were randomly failing
        // this should be half-way through button reset timeout
        // await timeout(50);
        //
        // // shows success button
        // let button = find('[data-test-button="upload-routes"]');
        // expect(button.length, 'no of success buttons').to.equal(1);
        // expect(
        //     button.hasClass('gh-btn-green'),
        //     'success button is green'
        // ).to.be.true;
        // expect(
        //     button.text().trim(),
        //     'success button text'
        // ).to.have.string('Uploaded');
        //
        // await wait();
        // returned to normal button

        let buttons = (0, _testHelpers.findAll)('[data-test-button="upload-routes"]');
        (0, _chai.expect)(buttons.length, 'no of post-success buttons').to.equal(1);
        (0, _chai.expect)(buttons[0], 'routes post-success button doesn\'t have success class').to.not.have.class('gh-btn-green');
        (0, _chai.expect)(buttons[0].textContent, 'routes post-success button text').to.have.string('Upload routes YAML'); // failed upload

        this.server.post('/settings/routes/yaml/', {
          errors: [{
            type: 'BadRequestError',
            message: 'Test failure message'
          }]
        }, 400);
        await (0, _fileUpload.fileUpload)('[data-test-file-input="routes"] input', ['test'], {
          name: 'routes-bad.yaml',
          type: 'application/x-yaml'
        }); // TODO: tests for the temporary success/failure state have been
        // disabled because they were randomly failing
        // this should be half-way through button reset timeout
        // await timeout(50);
        //
        // shows failure button
        // button = find('[data-test-button="upload-routes"]');
        // expect(button.length, 'no of failure buttons').to.equal(1);
        // expect(
        //     button.hasClass('gh-btn-red'),
        //     'failure button is red'
        // ).to.be.true;
        // expect(
        //     button.text().trim(),
        //     'failure button text'
        // ).to.have.string('Upload Failed');
        //
        // await wait();
        // shows error message

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="routes"]').textContent, 'routes upload error text').to.have.string('Test failure message'); // returned to normal button

        buttons = (0, _testHelpers.findAll)('[data-test-button="upload-routes"]');
        (0, _chai.expect)(buttons.length, 'no of post-failure buttons').to.equal(1);
        (0, _chai.expect)(buttons[0], 'routes post-failure button doesn\'t have failure class').to.not.have.class('gh-btn-red');
        (0, _chai.expect)(buttons[0].textContent, 'routes post-failure button text').to.have.string('Upload routes YAML'); // successful upload clears error

        this.server.post('/settings/routes/yaml/', {}, 200);
        await (0, _fileUpload.fileUpload)('[data-test-file-input="routes"] input', ['test'], {
          name: 'routes-good.yaml',
          type: 'application/x-yaml'
        });
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="routes"]')).to.not.exist; // can download redirects.json

        await (0, _testHelpers.click)('[data-test-link="download-routes"]');
        let iframe = document.querySelector('#iframeDownload');
        (0, _chai.expect)(iframe.getAttribute('src')).to.have.string('/settings/routes/yaml/');
      });
    });
    (0, _mocha.describe)('When logged in as Owner', function () {
      (0, _mocha.beforeEach)(async function () {
        let role = this.server.create('role', {
          name: 'Owner'
        });
        this.server.create('user', {
          roles: [role]
        });
        return await (0, _testSupport.authenticateSession)();
      });

      _mocha.it.skip('sets the mailgunBaseUrl to the default', async function () {
        await (0, _visit.visit)('/settings/members');
        await (0, _testHelpers.fillIn)('[data-test-mailgun-api-key-input]', 'i_am_an_api_key');
        await (0, _testHelpers.fillIn)('[data-test-mailgun-domain-input]', 'https://domain.tld');
        await (0, _testHelpers.click)('[data-test-button="save-members-settings"]');
        let [lastRequest] = this.server.pretender.handledRequests.slice(-1);
        let params = JSON.parse(lastRequest.requestBody);
        (0, _chai.expect)(params.settings.findBy('key', 'mailgun_base_url').value).not.to.equal(null);
      });
    });
  });
});
define("ghost-admin/tests/acceptance/settings/membership-test", ["ember-simple-auth/test-support", "@ember/test-helpers", "chai", "ember-mocha", "ember-cli-mirage/test-support", "ghost-admin/tests/helpers/visit"], function (_testSupport, _testHelpers, _chai, _emberMocha, _testSupport2, _visit) {
  "use strict";

  describe('Acceptance: Settings - Membership', function () {
    const hooks = (0, _emberMocha.setupApplicationTest)();
    (0, _testSupport2.setupMirage)(hooks);
    beforeEach(function () {});
    beforeEach(async function () {
      this.server.loadFixtures('configs');
      this.server.loadFixtures('tiers');
      this.server.db.configs.update(1, {
        blogUrl: 'http://localhost:2368'
      });
      const role = this.server.create('role', {
        name: 'Owner'
      });
      this.server.create('user', {
        roles: [role]
      });
      return await (0, _testSupport.authenticateSession)();
    });
    describe('permissions', function () {
      let visitAs;
      before(function () {
        visitAs = async roleName => {
          const role = this.server.create('role', {
            name: roleName
          });
          this.server.create('user', {
            roles: [role]
          });
          await (0, _testSupport.authenticateSession)();
          await (0, _visit.visit)('/settings/members');
        };
      });
      beforeEach(async function () {
        this.server.db.users.remove();
        await (0, _testSupport.invalidateSession)();
      });
      it('allows Owners', async function () {
        await visitAs('Owner');
        (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/settings/members');
      });
      it('allows Administrators', async function () {
        await visitAs('Administrator');
        (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/settings/members');
      });
      it('disallows Editors', async function () {
        await visitAs('Editor');
        (0, _chai.expect)((0, _testHelpers.currentURL)()).to.not.equal('/settings/members');
      });
      it('disallows Authors', async function () {
        await visitAs('Author');
        (0, _chai.expect)((0, _testHelpers.currentURL)()).to.not.equal('/settings/members');
      });
      it('disallows Contributors', async function () {
        await visitAs('Contributor');
        (0, _chai.expect)((0, _testHelpers.currentURL)()).to.not.equal('/settings/members');
      });
    });
    it('can change subscription access', async function () {
      await (0, _visit.visit)('/settings/members');
      (0, _chai.expect)(this.server.db.settings.findBy({
        key: 'members_signup_access'
      }).value).to.equal('all');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-members-subscription-option="all"]'), 'initial selection is "all"').to.exist;
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-iframe="portal-preview"]'), 'initial preview src matches "all"').to.have.attribute('src').match(/membersSignupAccess=all/); // open dropdown

      await (0, _testHelpers.click)('[data-test-members-subscription-option="all"]'); // all settings exist in dropdown

      (0, _chai.expect)((0, _testHelpers.find)('.ember-power-select-options [data-test-members-subscription-option="all"]'), 'all option').to.exist;
      (0, _chai.expect)((0, _testHelpers.find)('.ember-power-select-options [data-test-members-subscription-option="invite"]'), 'invite option').to.exist;
      (0, _chai.expect)((0, _testHelpers.find)('.ember-power-select-options [data-test-members-subscription-option="none"]'), 'none option').to.exist; // switch to invite

      await (0, _testHelpers.click)('.ember-power-select-options [data-test-members-subscription-option="invite"]');
      (0, _chai.expect)((0, _testHelpers.find)('.ember-power-select-options'), 'dropdown closes').to.not.exist;
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-members-subscription-option="invite"]'), 'invite option shown after selected').to.exist;
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-iframe="portal-preview"]')).to.have.attribute('src').match(/membersSignupAccess=invite/);
      await (0, _testHelpers.click)('[data-test-button="save-settings"]');
      (0, _chai.expect)(this.server.db.settings.findBy({
        key: 'members_signup_access'
      }).value).to.equal('invite'); // switch to nobody

      await (0, _testHelpers.click)('[data-test-members-subscription-option="invite"]');
      await (0, _testHelpers.click)('.ember-power-select-options [data-test-members-subscription-option="none"]');
      (0, _chai.expect)((0, _testHelpers.find)('.ember-power-select-options'), 'dropdown closes').to.not.exist;
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-members-subscription-option="none"]'), 'none option shown after selected').to.exist;
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-iframe="portal-preview"]')).to.not.exist;
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-portal-preview-disabled]')).to.exist;
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-default-post-access] .ember-basic-dropdown-trigger')).to.have.attribute('aria-disabled', 'true');
      await (0, _testHelpers.click)('[data-test-button="save-settings"]');
      (0, _chai.expect)(this.server.db.settings.findBy({
        key: 'members_signup_access'
      }).value).to.equal('none'); // automatically saves when switching back off nobody

      await (0, _testHelpers.click)('[data-test-members-subscription-option="none"]');
      await (0, _testHelpers.click)('.ember-power-select-options [data-test-members-subscription-option="invite"]');
      (0, _chai.expect)(this.server.db.settings.findBy({
        key: 'members_signup_access'
      }).value).to.equal('invite');
    });
    it('can change default post access', async function () {
      await (0, _visit.visit)('/settings/members'); // fixtures match what we expect

      (0, _chai.expect)(this.server.db.settings.findBy({
        key: 'default_content_visibility'
      }).value).to.equal('public');
      (0, _chai.expect)(this.server.db.settings.findBy({
        key: 'default_content_visibility_tiers'
      }).value).to.equal('[]');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-default-post-access-option="public"]'), 'initial selection is "public"').to.exist;
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-default-post-access-tiers]')).to.not.exist; // open dropdown

      await (0, _testHelpers.click)('[data-test-default-post-access-option="public"]'); // all settings exist in dropdown

      (0, _chai.expect)((0, _testHelpers.find)('.ember-power-select-options [data-test-default-post-access-option="public"]'), 'public option').to.exist;
      (0, _chai.expect)((0, _testHelpers.find)('.ember-power-select-options [data-test-default-post-access-option="members"]'), 'members-only option').to.exist;
      (0, _chai.expect)((0, _testHelpers.find)('.ember-power-select-options [data-test-default-post-access-option="paid"]'), 'paid-only option').to.exist;
      (0, _chai.expect)((0, _testHelpers.find)('.ember-power-select-options [data-test-default-post-access-option="tiers"]'), 'specific tiers option').to.exist; // switch to members only

      await (0, _testHelpers.click)('.ember-power-select-options [data-test-default-post-access-option="members"]');
      await (0, _testHelpers.click)('[data-test-button="save-settings"]');
      (0, _chai.expect)(this.server.db.settings.findBy({
        key: 'default_content_visibility'
      }).value).to.equal('members');
      (0, _chai.expect)(this.server.db.settings.findBy({
        key: 'default_content_visibility_tiers'
      }).value).to.equal('[]');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-default-post-access-option="members"]'), 'post-members selection is "members"').to.exist;
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-default-post-access-tiers]')).to.not.exist; // can switch to specific tiers

      await (0, _testHelpers.click)('[data-test-default-post-access-option="members"]');
      await (0, _testHelpers.click)('.ember-power-select-options [data-test-default-post-access-option="tiers"]'); // tiers input is shown

      (0, _chai.expect)((0, _testHelpers.find)('[data-test-default-post-access-tiers]')).to.exist; // open tiers dropdown

      await (0, _testHelpers.click)('[data-test-default-post-access-tiers] .ember-basic-dropdown-trigger'); // paid tiers are available in tiers input

      (0, _chai.expect)((0, _testHelpers.find)('[data-test-default-post-access-tiers] [data-test-visibility-segment-option="Default Tier"]')).to.exist; // select tier

      await (0, _testHelpers.click)('[data-test-default-post-access-tiers] [data-test-visibility-segment-option="Default Tier"]'); // save

      await (0, _testHelpers.click)('[data-test-button="save-settings"]');
      (0, _chai.expect)(this.server.db.settings.findBy({
        key: 'default_content_visibility'
      }).value).to.equal('tiers');
      (0, _chai.expect)(this.server.db.settings.findBy({
        key: 'default_content_visibility_tiers'
      }).value).to.equal('["2"]'); // switch back to non-tiers option

      await (0, _testHelpers.click)('[data-test-default-post-access-option="tiers"]');
      await (0, _testHelpers.click)('.ember-power-select-options [data-test-default-post-access-option="paid"]');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-default-post-access-tiers]')).to.not.exist;
      await (0, _testHelpers.click)('[data-test-button="save-settings"]');
      (0, _chai.expect)(this.server.db.settings.findBy({
        key: 'default_content_visibility'
      }).value).to.equal('paid');
      (0, _chai.expect)(this.server.db.settings.findBy({
        key: 'default_content_visibility_tiers'
      }).value).to.equal('["2"]');
    });
    it('can manage free tier', async function () {
      await (0, _visit.visit)('/settings/members');
      await (0, _testHelpers.click)('[data-test-button="toggle-free-settings"]');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-free-settings-expanded]'), 'expanded free settings').to.exist; // we aren't viewing the non-labs-flag input

      (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="old-free-welcome-page"]')).to.not.exist; // it can set free signup welcome page
      // initial value

      (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="free-welcome-page"]')).to.exist;
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="free-welcome-page"]')).to.have.value(''); // saving

      await (0, _testHelpers.fillIn)('[data-test-input="free-welcome-page"]', 'not a url');
      await (0, _testHelpers.blur)('[data-test-input="free-welcome-page"]');
      await (0, _testHelpers.click)('[data-test-button="save-settings"]');
      (0, _chai.expect)(this.server.db.tiers.findBy({
        slug: 'free'
      }).welcomePageUrl).to.equal('/not%20a%20url'); // re-rendering will insert full URL in welcome page input

      await (0, _visit.visit)('/settings');
      await (0, _visit.visit)('/settings/members');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="free-welcome-page"]')).to.exist;
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="free-welcome-page"]')).to.have.value('http://localhost:2368/not%20a%20url'); // it can manage free tier description and benefits
      // initial free tier details are as expected

      (0, _chai.expect)((0, _testHelpers.find)('[data-test-tier-card="free"]')).to.exist;
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-tier-card="free"] [data-test-name]')).to.contain.text('Free');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-tier-card="free"] [data-test-description]')).to.contain.text('No description');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-tier-card="free"] [data-test-benefits]')).to.contain.text('No benefits');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-tier-card="free"] [data-test-free-price]')).to.exist; // open modal

      await (0, _testHelpers.click)('[data-test-tier-card="free"] [data-test-button="edit-tier"]'); // initial modal state is as expected

      const modal = '[data-test-modal="edit-tier"]';
      (0, _chai.expect)((0, _testHelpers.find)(modal)).to.exist;
      (0, _chai.expect)((0, _testHelpers.find)(`${modal} [data-test-input="tier-name"]`)).to.not.exist;
      (0, _chai.expect)((0, _testHelpers.find)(`${modal} [data-test-input="tier-description"]`)).to.not.exist;
      (0, _chai.expect)((0, _testHelpers.find)(`${modal} [data-test-input="free-tier-description"]`)).to.exist;
      (0, _chai.expect)((0, _testHelpers.find)(`${modal} [data-test-input="free-tier-description"]`)).to.have.value('');
      (0, _chai.expect)((0, _testHelpers.find)(`${modal} [data-test-formgroup="prices"]`)).to.not.exist;
      (0, _chai.expect)((0, _testHelpers.find)(`${modal} [data-test-benefit-item="new"]`)).to.exist;
      (0, _chai.expect)((0, _testHelpers.findAll)(`${modal} [data-test-benefit-item]`).length).to.equal(1);
      (0, _chai.expect)((0, _testHelpers.find)(`${modal} [data-test-tierpreview-title]`)).to.contain.text('Free Membership Preview');
      (0, _chai.expect)((0, _testHelpers.find)(`${modal} [data-test-tierpreview-description]`)).to.contain.text('Free preview of');
      (0, _chai.expect)((0, _testHelpers.find)(`${modal} [data-test-tierpreview-benefits]`)).to.contain.text('Access to all public posts');
      (0, _chai.expect)((0, _testHelpers.find)(`${modal} [data-test-tierpreview-price]`).textContent).to.match(/\$\s+0/); // can change description

      await (0, _testHelpers.fillIn)(`${modal} [data-test-input="free-tier-description"]`, 'Test description');
      (0, _chai.expect)((0, _testHelpers.find)(`${modal} [data-test-tierpreview-description]`)).to.contain.text('Test description'); // can manage benefits

      const newBenefit = `${modal} [data-test-benefit-item="new"]`;
      await (0, _testHelpers.fillIn)(`${newBenefit} [data-test-input="benefit-label"]`, 'First benefit');
      await (0, _testHelpers.click)(`${newBenefit} [data-test-button="add-benefit"]`);
      (0, _chai.expect)((0, _testHelpers.find)(`${modal} [data-test-tierpreview-benefits]`)).to.contain.text('First benefit');
      (0, _chai.expect)((0, _testHelpers.find)(`${modal} [data-test-benefit-item="0"]`)).to.exist;
      (0, _chai.expect)((0, _testHelpers.find)(`${modal} [data-test-benefit-item="new"]`)).to.exist;
      await (0, _testHelpers.click)(`${newBenefit} [data-test-button="add-benefit"]`);
      (0, _chai.expect)((0, _testHelpers.find)(`${newBenefit}`)).to.contain.text('Please enter a benefit');
      await (0, _testHelpers.fillIn)(`${newBenefit} [data-test-input="benefit-label"]`, 'Second benefit');
      await (0, _testHelpers.click)(`${newBenefit} [data-test-button="add-benefit"]`);
      (0, _chai.expect)((0, _testHelpers.find)(`${modal} [data-test-tierpreview-benefits]`)).to.contain.text('Second benefit');
      (0, _chai.expect)((0, _testHelpers.findAll)(`${modal} [data-test-tierpreview-benefits] div`).length).to.equal(4);
      await (0, _testHelpers.click)(`${modal} [data-test-benefit-item="0"] [data-test-button="delete-benefit"]`);
      (0, _chai.expect)((0, _testHelpers.find)(`${modal} [data-test-tierpreview-benefits]`)).to.not.contain.text('First benefit');
      (0, _chai.expect)((0, _testHelpers.findAll)(`${modal} [data-test-tierpreview-benefits] div`).length).to.equal(2); // Add a new benefit that we will later rename to an empty name

      await (0, _testHelpers.fillIn)(`${newBenefit} [data-test-input="benefit-label"]`, 'Third benefit');
      await (0, _testHelpers.click)(`${newBenefit} [data-test-button="add-benefit"]`);
      (0, _chai.expect)((0, _testHelpers.find)(`${modal} [data-test-tierpreview-benefits]`)).to.contain.text('Third benefit');
      (0, _chai.expect)((0, _testHelpers.findAll)(`${modal} [data-test-tierpreview-benefits] div`).length).to.equal(4); // Clear the second benefit's name (it should get removed after saving)

      const secondBenefitItem = `${modal} [data-test-benefit-item="1"]`;
      await (0, _testHelpers.fillIn)(`${secondBenefitItem} [data-test-input="benefit-label"]`, '');
      await (0, _testHelpers.click)('[data-test-button="save-tier"]');
      (0, _chai.expect)((0, _testHelpers.find)(`${modal}`)).to.not.exist;
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-tier-card="free"] [data-test-name]')).to.contain.text('Free');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-tier-card="free"] [data-test-description]')).to.contain.text('Test description');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-tier-card="free"] [data-test-benefits]')).to.contain.text('Benefits (1)');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-tier-card="free"] [data-test-benefits] li:nth-of-type(1)')).to.contain.text('Second benefit');
      (0, _chai.expect)((0, _testHelpers.findAll)(`[data-test-tier-card="free"] [data-test-benefits] li`).length).to.equal(1);
      const freeTier = this.server.db.tiers.findBy({
        slug: 'free'
      });
      (0, _chai.expect)(freeTier.description).to.equal('Test description');
      (0, _chai.expect)(freeTier.welcomePageUrl).to.equal('/not%20a%20url');
      (0, _chai.expect)(freeTier.benefits.length).to.equal(1);
      (0, _chai.expect)(freeTier.benefits[0]).to.equal('Second benefit');
    });
  });
});
define("ghost-admin/tests/acceptance/settings/navigation-test", ["ghost-admin/utils/ctrl-or-cmd", "ember-simple-auth/test-support", "mocha", "@ember/test-helpers", "chai", "ember-mocha", "ember-cli-mirage/test-support", "ghost-admin/tests/helpers/visit"], function (_ctrlOrCmd, _testSupport, _mocha, _testHelpers, _chai, _emberMocha, _testSupport2, _visit) {
  "use strict";

  // simulate jQuery's `:visible` pseudo-selector
  function withText(elements) {
    return Array.from(elements).filter(elem => elem.textContent.trim() !== '');
  }

  (0, _mocha.describe)('Acceptance: Settings - Navigation', function () {
    let hooks = (0, _emberMocha.setupApplicationTest)();
    (0, _testSupport2.setupMirage)(hooks);
    (0, _mocha.describe)('when logged in', function () {
      (0, _mocha.beforeEach)(async function () {
        let role = this.server.create('role', {
          name: 'Administrator'
        });
        this.server.create('user', {
          roles: [role]
        });
        await (0, _testSupport.authenticateSession)();
      });
      (0, _mocha.it)('can visit /settings/navigation', async function () {
        await (0, _visit.visit)('/settings/navigation');
        (0, _chai.expect)((0, _testHelpers.currentRouteName)()).to.equal('settings.navigation');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-save-button]').textContent.trim(), 'save button text').to.equal('Save'); // fixtures contain two nav items, check for four rows as we
        // should have one extra that's blank for each navigation section

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-navitem]').length, 'navigation items count').to.equal(4);
      });
      (0, _mocha.it)('saves navigation settings', async function () {
        await (0, _visit.visit)('/settings/navigation');
        await (0, _testHelpers.fillIn)('#settings-navigation [data-test-navitem="0"] [data-test-input="label"]', 'Test');
        await (0, _testHelpers.typeIn)('#settings-navigation [data-test-navitem="0"] [data-test-input="url"]', '/test');
        await (0, _testHelpers.click)('[data-test-save-button]');
        let [navSetting] = this.server.db.settings.where({
          key: 'navigation'
        });
        (0, _chai.expect)(navSetting.value).to.equal('[{"label":"Test","url":"/test/"},{"label":"About","url":"/about"}]'); // don't test against .error directly as it will pick up failed
        // tests "pre.error" elements

        (0, _chai.expect)((0, _testHelpers.findAll)('span.error').length, 'error messages count').to.equal(0);
        (0, _chai.expect)((0, _testHelpers.findAll)('.gh-alert').length, 'alerts count').to.equal(0);
        (0, _chai.expect)(withText((0, _testHelpers.findAll)('[data-test-error]')).length, 'validation errors count').to.equal(0);
      });
      (0, _mocha.it)('validates new item correctly on save', async function () {
        await (0, _visit.visit)('/settings/navigation');
        await (0, _testHelpers.click)('[data-test-save-button]');
        (0, _chai.expect)((0, _testHelpers.findAll)('#settings-navigation [data-test-navitem]').length, 'number of nav items after saving with blank new item').to.equal(3);
        await (0, _testHelpers.fillIn)('#settings-navigation [data-test-navitem="new"] [data-test-input="label"]', 'Test');
        await (0, _testHelpers.fillIn)('#settings-navigation [data-test-navitem="new"] [data-test-input="url"]', '');
        await (0, _testHelpers.typeIn)('#settings-navigation [data-test-navitem="new"] [data-test-input="url"]', 'http://invalid domain/');
        await (0, _testHelpers.click)('[data-test-save-button]');
        (0, _chai.expect)((0, _testHelpers.findAll)('#settings-navigation [data-test-navitem]').length, 'number of nav items after saving with invalid new item').to.equal(3);
        (0, _chai.expect)(withText((0, _testHelpers.findAll)('#settings-navigation [data-test-navitem="new"] [data-test-error]')).length, 'number of invalid fields in new item').to.equal(1);
      });
      (0, _mocha.it)('clears unsaved settings when navigating away but warns with a confirmation dialog', async function () {
        await (0, _visit.visit)('/settings/navigation');
        await (0, _testHelpers.fillIn)('[data-test-navitem="0"] [data-test-input="label"]', 'Test');
        await (0, _testHelpers.blur)('[data-test-navitem="0"] [data-test-input="label"]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-navitem="0"] [data-test-input="label"]').value).to.equal('Test');
        await (0, _visit.visit)('/settings/code-injection');
        (0, _chai.expect)((0, _testHelpers.findAll)('.fullscreen-modal').length, 'modal exists').to.equal(1); // Leave without saving

        await (0, _testHelpers.click)('.fullscreen-modal [data-test-leave-button]'), 'leave without saving';
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/code-injection');
        await (0, _visit.visit)('/settings/navigation');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-navitem="0"] [data-test-input="label"]').value).to.equal('Home');
      });
      (0, _mocha.it)('can add and remove items', async function () {
        await (0, _visit.visit)('/settings/navigation');
        await (0, _testHelpers.click)('#settings-navigation .gh-blognav-add');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-navitem="new"] [data-test-error="label"]').textContent.trim(), 'blank label has validation error').to.not.be.empty;
        await (0, _testHelpers.fillIn)('[data-test-navitem="new"] [data-test-input="label"]', '');
        await (0, _testHelpers.typeIn)('[data-test-navitem="new"] [data-test-input="label"]', 'New');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-navitem="new"] [data-test-error="label"]').textContent.trim(), 'label validation is visible after typing').to.be.empty;
        await (0, _testHelpers.fillIn)('[data-test-navitem="new"] [data-test-input="url"]', '');
        await (0, _testHelpers.typeIn)('[data-test-navitem="new"] [data-test-input="url"]', '/new');
        await (0, _testHelpers.blur)('[data-test-navitem="new"] [data-test-input="url"]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-navitem="new"] [data-test-error="url"]').textContent.trim(), 'url validation is visible after typing').to.be.empty;
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-navitem="new"] [data-test-input="url"]').value).to.equal(`${window.location.origin}/new/`);
        await (0, _testHelpers.click)('.gh-blognav-add');
        (0, _chai.expect)((0, _testHelpers.findAll)('#settings-navigation [data-test-navitem]').length, 'number of nav items after successful add').to.equal(4);
        (0, _chai.expect)((0, _testHelpers.find)('#settings-navigation [data-test-navitem="new"] [data-test-input="label"]').value, 'new item label value after successful add').to.be.empty;
        (0, _chai.expect)((0, _testHelpers.find)('#settings-navigation [data-test-navitem="new"] [data-test-input="url"]').value, 'new item url value after successful add').to.equal(`${window.location.origin}/`);
        (0, _chai.expect)(withText((0, _testHelpers.findAll)('[data-test-navitem] [data-test-error]')).length, 'number or validation errors shown after successful add').to.equal(0);
        await (0, _testHelpers.click)('#settings-navigation [data-test-navitem="0"] .gh-blognav-delete');
        (0, _chai.expect)((0, _testHelpers.findAll)('#settings-navigation [data-test-navitem]').length, 'number of nav items after successful remove').to.equal(3); // CMD-S shortcut works

        await (0, _testHelpers.triggerEvent)('.gh-app', 'keydown', {
          keyCode: 83,
          // s
          metaKey: _ctrlOrCmd.default === 'command',
          ctrlKey: _ctrlOrCmd.default === 'ctrl'
        });
        let [navSetting] = this.server.db.settings.where({
          key: 'navigation'
        });
        (0, _chai.expect)(navSetting.value).to.equal('[{"label":"About","url":"/about"},{"label":"New","url":"/new/"}]');
      });
      (0, _mocha.it)('can also add and remove items from seconday nav', async function () {
        await (0, _visit.visit)('/settings/navigation');
        await (0, _testHelpers.click)('#secondary-navigation .gh-blognav-add');
        (0, _chai.expect)((0, _testHelpers.find)('#secondary-navigation [data-test-navitem="new"] [data-test-error="label"]').textContent.trim(), 'blank label has validation error').to.not.be.empty;
        await (0, _testHelpers.fillIn)('#secondary-navigation [data-test-navitem="new"] [data-test-input="label"]', '');
        await (0, _testHelpers.typeIn)('#secondary-navigation [data-test-navitem="new"] [data-test-input="label"]', 'Foo');
        (0, _chai.expect)((0, _testHelpers.find)('#secondary-navigation [data-test-navitem="new"] [data-test-error="label"]').textContent.trim(), 'label validation is visible after typing').to.be.empty;
        await (0, _testHelpers.fillIn)('#secondary-navigation [data-test-navitem="new"] [data-test-input="url"]', '');
        await (0, _testHelpers.typeIn)('#secondary-navigation [data-test-navitem="new"] [data-test-input="url"]', '/bar');
        await (0, _testHelpers.blur)('#secondary-navigation [data-test-navitem="new"] [data-test-input="url"]');
        (0, _chai.expect)((0, _testHelpers.find)('#secondary-navigation [data-test-navitem="new"] [data-test-error="url"]').textContent.trim(), 'url validation is visible after typing').to.be.empty;
        (0, _chai.expect)((0, _testHelpers.find)('#secondary-navigation [data-test-navitem="new"] [data-test-input="url"]').value).to.equal(`${window.location.origin}/bar/`);
        await (0, _testHelpers.click)('[data-test-save-button]');
        (0, _chai.expect)((0, _testHelpers.findAll)('#secondary-navigation [data-test-navitem]').length, 'number of nav items after successful add').to.equal(2);
        (0, _chai.expect)((0, _testHelpers.find)('#secondary-navigation [data-test-navitem="new"] [data-test-input="label"]').value, 'new item label value after successful add').to.be.empty;
        (0, _chai.expect)((0, _testHelpers.find)('#secondary-navigation [data-test-navitem="new"] [data-test-input="url"]').value, 'new item url value after successful add').to.equal(`${window.location.origin}/`);
        (0, _chai.expect)(withText((0, _testHelpers.findAll)('#secondary-navigation [data-test-navitem] [data-test-error]')).length, 'number or validation errors shown after successful add').to.equal(0);
        let [navSetting] = this.server.db.settings.where({
          key: 'secondary_navigation'
        });
        (0, _chai.expect)(navSetting.value).to.equal('[{"label":"Foo","url":"/bar/"}]');
        await (0, _testHelpers.click)('#secondary-navigation [data-test-navitem="0"] .gh-blognav-delete');
        (0, _chai.expect)((0, _testHelpers.findAll)('#secondary-navigation [data-test-navitem]').length, 'number of nav items after successful remove').to.equal(1); // CMD-S shortcut works

        await (0, _testHelpers.triggerEvent)('.gh-app', 'keydown', {
          keyCode: 83,
          // s
          metaKey: _ctrlOrCmd.default === 'command',
          ctrlKey: _ctrlOrCmd.default === 'ctrl'
        });
        [navSetting] = this.server.db.settings.where({
          key: 'secondary_navigation'
        });
        (0, _chai.expect)(navSetting.value).to.equal('[]');
      });
    });
  });
});
define("ghost-admin/tests/acceptance/settings/newsletters-test", ["ember-simple-auth/test-support", "@ember/test-helpers", "chai", "ember-mocha", "ember-cli-mirage/test-support", "ghost-admin/tests/helpers/visit"], function (_testSupport, _testHelpers, _chai, _emberMocha, _testSupport2, _visit) {
  "use strict";

  async function checkValidationError(errors) {
    // Create the newsletter
    await (0, _testHelpers.click)('[data-test-button="save-newsletter"]'); // @todo: at the moment, the tabs don't open on error automatically
    // we need to remove these lines when this is fixed
    // and replace it with something like ± checkTabOpen('genexral')
    // await openTab('general.name');

    for (const selector of Object.keys(errors)) {
      (0, _chai.expect)((0, _testHelpers.findAll)(selector).length, 'field ' + selector + ' is not visible').to.equal(1);
      (0, _chai.expect)((0, _testHelpers.findAll)(selector + ' + .response').length, 'error message is displayed').to.equal(1);
      (0, _chai.expect)((0, _testHelpers.find)(selector + ' + .response').textContent).to.match(errors[selector]);
    } // Check button is in error state


    (0, _chai.expect)((0, _testHelpers.find)('[data-test-button="save-newsletter"] > [data-test-task-button-state="failure"]')).to.exist;
  }

  async function checkSave(options) {
    const name = options.edit ? 'edit' : 'create'; // Create the newsletter

    await (0, _testHelpers.click)('[data-test-button="save-newsletter"]'); // No errors

    (0, _chai.expect)((0, _testHelpers.findAll)('.error > .response').length, 'error message is displayed').to.equal(0);

    if (options.verifyEmail) {
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="confirm-newsletter-email"]'), 'Confirm email modal').to.exist; // Check message

      if (typeof verifyEmail !== 'boolean') {
        const t = (0, _testHelpers.find)('[data-test-modal="confirm-newsletter-email"] p').textContent.trim().replace(/\s+/g, ' ');
        (0, _chai.expect)(t).to.match(options.verifyEmail, t);
      }

      await (0, _testHelpers.click)('[data-test-button="confirm-newsletter-email"]');
    } // Check if modal closes on save


    (0, _chai.expect)((0, _testHelpers.find)(`[data-test-modal="${name}-newsletter"]`), 'Newsletter modal should disappear after saving').to.not.exist;
  }

  async function checkCancel(options) {
    const name = options.edit ? 'edit' : 'create'; // Create the newsletter

    await (0, _testHelpers.click)('[data-test-button="cancel-newsletter"]');

    if (options.shouldConfirm) {
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="unsaved-settings"]'), 'Confirm unsaved settings modal should be visible').to.exist;
      await (0, _testHelpers.click)('[data-test-leave-button]');
    } // Check if modal closes on save


    (0, _chai.expect)((0, _testHelpers.find)(`[data-test-modal="${name}-newsletter"]`), 'Newsletter modal should disappear after canceling').to.not.exist;
  }

  async function openTab(name) {
    let optional = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
    const generalToggleSelector = '[data-test-nav-toggle="' + name + '"]';
    const generalToggle = (0, _testHelpers.find)(generalToggleSelector);
    const doesExist = !!generalToggle;

    if (!doesExist && !optional) {
      throw new Error('Expected tab ' + name + ' to exist');
    }

    if (doesExist && !generalToggle.classList.contains('active')) {
      await (0, _testHelpers.click)(generalToggleSelector);

      if (!generalToggle.classList.contains('active')) {
        throw new Error('Could not open ' + name + ' tab');
      }
    }
  }

  async function closeTab(name) {
    let optional = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
    const generalToggleSelector = '[data-test-nav-toggle="' + name + '"]';
    const generalToggle = (0, _testHelpers.find)(generalToggleSelector);
    const doesExist = !!generalToggle;

    if (!doesExist && !optional) {
      throw new Error('Expected tab ' + name + ' to exist');
    }

    if (doesExist && generalToggle.classList.contains('active')) {
      await (0, _testHelpers.click)(generalToggleSelector);

      if (generalToggle.classList.contains('active')) {
        throw new Error('Could not close ' + name + ' tab');
      }
    }
  }

  async function fillName(name) {
    await openTab('general.name');
    await (0, _testHelpers.fillIn)('input#newsletter-title', name);
  }

  describe('Acceptance: Settings - Newsletters', function () {
    const hooks = (0, _emberMocha.setupApplicationTest)();
    (0, _testSupport2.setupMirage)(hooks);
    beforeEach(async function () {
      this.server.loadFixtures('configs', 'newsletters');
      const role = this.server.create('role', {
        name: 'Owner'
      });
      this.server.create('user', {
        roles: [role]
      });
      return await (0, _testSupport.authenticateSession)();
    });
    it('redirects old path', async function () {
      await (0, _visit.visit)('/settings/members-email');
      (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/settings/newsletters');
    });
    it('can manage open rate tracking', async function () {
      this.server.db.settings.update({
        key: 'email_track_opens'
      }, {
        value: 'true'
      });
      await (0, _visit.visit)('/settings/newsletters');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-checkbox="email-track-opens"]')).to.be.checked;
      await (0, _testHelpers.click)('[data-test-label="email-track-opens"]');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-checkbox="email-track-opens"]')).to.not.be.checked;
      await (0, _testHelpers.click)('[data-test-button="save-members-settings"]');
      (0, _chai.expect)(this.server.db.settings.findBy({
        key: 'email_track_opens'
      }).value).to.equal(false);
    });
    describe('Creating newsletters', function () {
      it('can create new newsletter', async function () {
        await (0, _visit.visit)('/settings/newsletters');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-newsletter]').length, 'Total newsletters shown').to.equal(1);
        await (0, _testHelpers.click)('[data-test-button="add-newsletter"]'); // Check if modal opens

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="create-newsletter"]'), 'Create newsletter modal').to.exist; // Fill in the newsletter name

        await fillName('My new newsletter'); // Fill in the newsletter description

        await (0, _testHelpers.fillIn)('textarea#newsletter-description', 'My newsletter description');
        await checkSave({});
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-newsletter]').length, 'Total newsletters shown afterwards').to.equal(2);
      });
      it('validates create newsletter before saving', async function () {
        await (0, _visit.visit)('/settings/newsletters');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-newsletter]').length, 'Total newsletters shown').to.equal(1);
        await (0, _testHelpers.click)('[data-test-button="add-newsletter"]'); // Check if modal opens

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="create-newsletter"]'), 'Create newsletter modal').to.exist; // Invalid name error when you try to save

        await checkValidationError({
          'input#newsletter-title': /Please enter a name./
        }); // Fill in the newsletter name

        await fillName('My new newsletter'); // Everything should be valid

        await checkSave({});
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-newsletter]').length, 'Total newsletters shown afterwards').to.equal(2);
      });
      it('checks limits when creating a newsletter', async function () {
        const config = this.server.db.configs.find(1);
        config.hostSettings = {
          limits: {
            newsletters: {
              max: 1,
              error: 'Your plan supports up to {{max}} newsletters. Please upgrade to add more.'
            }
          }
        };
        this.server.db.configs.update(1, config);
        await (0, _visit.visit)('/settings/newsletters');
        await (0, _testHelpers.click)('[data-test-button="add-newsletter"]'); // Check if modal doesn't open

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="create-newsletter"]'), 'Create newsletter modal').not.to.exist; // Check limits modal is shown

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="limits/multiple-newsletters"]'), 'Limits modal').to.exist; // Check can close modal

        await (0, _testHelpers.click)('[data-test-button="cancel-upgrade"]'); // Check modal is closed

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="limits/multiple-newsletters"]'), 'Limits modal').not.to.exist;
      });
    });
    describe('Editing newsletters', function () {
      it('can edit via menu if multiple newsletters', async function () {
        // Create an extra newsletter
        this.server.create('newsletter', {
          status: 'active',
          name: 'test newsletter',
          slug: 'test-newsletter'
        });
        await (0, _visit.visit)('/settings/newsletters');
        await (0, _testHelpers.click)('[data-test-newsletter-menu-trigger]');
        await (0, _testHelpers.click)('[data-test-button="customize-newsletter"]'); // Check if modal opens

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="edit-newsletter"]'), 'Edit newsletter modal').to.exist;
      });
      it('validates edit fields before saving', async function () {
        await (0, _visit.visit)('/settings/newsletters'); // When we only have a single newsletter, the customize button is shown instead of the menu button

        await (0, _testHelpers.click)('[data-test-button="customize-newsletter"]'); // Check if modal opens

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="edit-newsletter"]'), 'Edit newsletter modal').to.exist; // Clear newsletter name

        await fillName(''); // Invalid name error when you try to save

        await checkValidationError({
          'input#newsletter-title': /Please enter a name./
        }); // Fill in the newsletter name

        await fillName('My new newsletter'); // Enter an invalid email

        await openTab('general.email');
        await (0, _testHelpers.fillIn)('input#newsletter-sender-email', 'invalid-email'); // Check if it complains about the invalid email

        await checkValidationError({
          'input#newsletter-sender-email': /Invalid email./
        });
        await (0, _testHelpers.fillIn)('input#newsletter-sender-email', 'valid-email@email.com'); // Everything should be valid

        await checkSave({
          edit: true,
          verifyEmail: /default email address \(noreply/
        });
      });
      it('can open / close all tabs', async function () {
        await (0, _visit.visit)('/settings/newsletters'); // When we only have a single newsletter, the customize button is shown instead of the menu button

        await (0, _testHelpers.click)('[data-test-button="customize-newsletter"]'); // Check if modal opens

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="edit-newsletter"]'), 'Edit newsletter modal').to.exist;
        await openTab('general.name', false);
        await closeTab('general.name', false);
        await openTab('general.email', false);
        await closeTab('general.email', false);
        await openTab('general.member', false);
        await closeTab('general.member', false);
        await openTab('design.header', false);
        await closeTab('design.header', false);
        await openTab('design.body', false);
        await closeTab('design.body', false);
        await openTab('design.footer', false);
        await closeTab('design.footer', false);
      });
      it('shows current sender email in verify modal', async function () {
        this.server.create('newsletter', {
          status: 'active',
          name: 'test newsletter',
          slug: 'test-newsletter',
          senderEmail: 'test@example.com'
        });
        await (0, _visit.visit)('/settings/newsletters'); // Edit the last newsletter

        await (0, _testHelpers.click)('[data-test-newsletter="test-newsletter"] [data-test-newsletter-menu-trigger]');
        await (0, _testHelpers.click)('[data-test-button="customize-newsletter"]'); // Check if modal opens

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="edit-newsletter"]'), 'Edit newsletter modal').to.exist;
        await openTab('general.email');
        await (0, _testHelpers.fillIn)('input#newsletter-sender-email', 'valid-email@email.com'); // Everything should be valid

        await checkSave({
          edit: true,
          verifyEmail: /previous email address \(test@example\.com\)/
        });
      });
      it('does not ask to confirm saved changes', async function () {
        await (0, _visit.visit)('/settings/newsletters'); // When we only have a single newsletter, the customize button is shown instead of the menu button

        await (0, _testHelpers.click)('[data-test-button="customize-newsletter"]'); // Check if modal opens

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="edit-newsletter"]'), 'Edit newsletter modal').to.exist; // Make no changes
        // Everything should be valid

        await checkCancel({
          edit: true,
          shouldConfirm: false
        });
      });
      it('asks to confirm unsaved changes', async function () {
        async function doCheck(tabName, field) {
          await (0, _visit.visit)('/settings/newsletters'); // When we only have a single newsletter, the customize button is shown instead of the menu button

          await (0, _testHelpers.click)('[data-test-button="customize-newsletter"]'); // Check if modal opens

          (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="edit-newsletter"]'), 'Edit newsletter modal').to.exist; // Make a change

          await openTab(tabName, false);

          if (field.input) {
            await (0, _testHelpers.fillIn)(field.input, field.value ?? 'my changed value');
          } else if (field.toggle) {
            await (0, _testHelpers.click)(field.toggle);
          } else if (field.dropdown) {
            // Open dropdown
            await (0, _testHelpers.click)(`${field.dropdown} .ember-basic-dropdown-trigger`); // Click first not-selected option

            await (0, _testHelpers.click)(`${field.dropdown} li.ember-power-select-option[aria-current="false"]`);
          } // Everything should be valid


          await checkCancel({
            edit: true,
            shouldConfirm: true
          });
        } // General name


        await doCheck('general.name', {
          input: '#newsletter-title'
        });
        await doCheck('general.name', {
          input: '#newsletter-description'
        }); // General email

        await doCheck('general.email', {
          input: '#newsletter-sender-name'
        });
        await doCheck('general.email', {
          input: '#newsletter-sender-email'
        });
        await doCheck('general.email', {
          input: '#newsletter-reply-to',
          value: 'support'
        }); // Member settings

        await doCheck.call(this, 'general.member', {
          toggle: '[data-test-toggle="subscribeOnSignup"]'
        }); // Design header

        await doCheck.call(this, 'design.header', {
          toggle: '[data-test-toggle="showHeaderTitle"]'
        });
        await doCheck.call(this, 'design.header', {
          toggle: '[data-test-toggle="showHeaderName"]'
        }); // Design body

        await doCheck.call(this, 'design.body', {
          dropdown: '[data-test-input="titleFontCategory"]'
        });
        await doCheck.call(this, 'design.body', {
          toggle: '#newsletter-title-alignment button:not(.gh-btn-group-selected)'
        });
        await doCheck.call(this, 'design.body', {
          dropdown: '[data-test-input="bodyFontCategory"]'
        });
        await doCheck.call(this, 'design.body', {
          toggle: '#show-feature-image'
        }); // Design footer

        await doCheck('design.footer', {
          input: '[contenteditable="true"]'
        });
      });
    });
    describe('Archiving newsletters', function () {
      it('can archive newsletters', async function () {
        // Create an extra newsletter, because we cannot archive the last one
        this.server.create('newsletter', {
          status: 'active',
          name: 'test newsletter',
          slug: 'test-newsletter'
        });
        await (0, _visit.visit)('/settings/newsletters'); // Check total newsletters shown

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-newsletter]').length, 'Total newsletters shown').to.equal(2); // Toggle is hidden

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-dropdown="newsletter-status-filter"] .ember-power-select-trigger')).not.to.exist;
        await (0, _testHelpers.click)('[data-test-newsletter-menu-trigger]');
        await (0, _testHelpers.click)('[data-test-button="archive-newsletter"]'); // Check if confimation modal opens

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="confirm-newsletter-archive"]'), 'Archive newsletter modal').to.exist; // Confirm archive

        await (0, _testHelpers.click)('[data-test-button="confirm-newsletter-archive"]'); // Check total newsletters equals 1

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-newsletter]').length, 'Total newsletters shown').to.equal(1); // Toggle is shown now

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-dropdown="newsletter-status-filter"] .ember-power-select-trigger')).to.exist;
      });
      it('can reactivate newsletters if only archived newsletter left', async function () {
        // Create an extra newsletter, to check counts
        this.server.create('newsletter', {
          status: 'active',
          name: 'test newsletter',
          slug: 'test-newsletter'
        }); // Create an archived newsletter, beacuse the toggle is invisible otherwise

        this.server.create('newsletter', {
          status: 'archived',
          name: 'test newsletter 2',
          slug: 'test-newsletter2'
        });
        await (0, _visit.visit)('/settings/newsletters'); // Check total newsletters shown

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-newsletter]').length, 'Total newsletters shown').to.equal(2); // Go to archived newsletters

        await (0, _testHelpers.click)('[data-test-dropdown="newsletter-status-filter"] .ember-power-select-trigger');
        await (0, _testHelpers.click)('.ember-power-select-option[aria-selected="false"]'); // Check title okay

        (0, _chai.expect)((0, _testHelpers.find)('.gh-newsletters .gh-expandable-title').textContent.trim(), 'Title').to.equal('Archived newsletters'); // Check total newsletters shown

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-newsletter]').length, 'Total archived newsletters shown').to.equal(1); // Reactivate the newsletter

        await (0, _testHelpers.click)('[data-test-newsletter-menu-trigger]');
        await (0, _testHelpers.click)('[data-test-button="reactivate-newsletter"]'); // Check if confimation modal opens

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="confirm-newsletter-reactivate"]'), 'Reactivate newsletter modal').to.exist; // Confirm archive

        await (0, _testHelpers.click)('[data-test-button="confirm-newsletter-reactivate"]'); // Check automatically went back to all (because no newsletters archived)
        // Check title okay

        (0, _chai.expect)((0, _testHelpers.find)('.gh-newsletters .gh-expandable-title').textContent.trim(), 'Title').to.equal('Active newsletters'); // Check total newsletters shown

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-newsletter]').length, 'Total newsletters shown').to.equal(3);
      });
      it('can reactivate newsletters', async function () {
        // Create an extra newsletter, to check counts
        this.server.create('newsletter', {
          status: 'active',
          name: 'test newsletter',
          slug: 'test-newsletter'
        }); // Create an archived newsletter, beacuse the toggle is invisible otherwise

        this.server.create('newsletter', {
          status: 'archived',
          name: 'test newsletter 2',
          slug: 'test-newsletter2'
        });
        this.server.create('newsletter', {
          status: 'archived',
          name: 'test newsletter 3',
          slug: 'test-newsletter3'
        });
        await (0, _visit.visit)('/settings/newsletters'); // Check total newsletters shown

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-newsletter]').length, 'Total newsletters shown').to.equal(2); // Go to archived newsletters

        await (0, _testHelpers.click)('[data-test-dropdown="newsletter-status-filter"] .ember-power-select-trigger');
        await (0, _testHelpers.click)('.ember-power-select-option[aria-selected="false"]'); // Check title okay

        (0, _chai.expect)((0, _testHelpers.find)('.gh-newsletters .gh-expandable-title').textContent.trim(), 'Title').to.equal('Archived newsletters'); // Check total newsletters shown

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-newsletter]').length, 'Total archived newsletters shown').to.equal(2); // Reactivate the newsletter

        await (0, _testHelpers.click)('[data-test-newsletter-menu-trigger]');
        await (0, _testHelpers.click)('[data-test-button="reactivate-newsletter"]'); // Check if confimation modal opens

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="confirm-newsletter-reactivate"]'), 'Reactivate newsletter modal').to.exist; // Confirm archive

        await (0, _testHelpers.click)('[data-test-button="confirm-newsletter-reactivate"]'); // Check still showing archived newsletters

        (0, _chai.expect)((0, _testHelpers.find)('.gh-newsletters .gh-expandable-title').textContent.trim(), 'Title').to.equal('Archived newsletters'); // Go to active newsletters

        await (0, _testHelpers.click)('[data-test-dropdown="newsletter-status-filter"] .ember-power-select-trigger');
        await (0, _testHelpers.click)('.ember-power-select-option[aria-selected="false"]'); // Check automatically went back to all (because no newsletters archived)
        // Check title okay

        (0, _chai.expect)((0, _testHelpers.find)('.gh-newsletters .gh-expandable-title').textContent.trim(), 'Title').to.equal('Active newsletters'); // Check total newsletters shown

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-newsletter]').length, 'Total newsletters shown').to.equal(3);
      });
      it('checks limits when reactivating a newsletter', async function () {
        const config = this.server.db.configs.find(1);
        config.hostSettings = {
          limits: {
            newsletters: {
              max: 1,
              error: 'Your plan supports up to {{max}} newsletters. Please upgrade to add more.'
            }
          }
        };
        this.server.db.configs.update(1, config); // Create an archived newsletter, beacuse the toggle is invisible otherwise

        this.server.create('newsletter', {
          status: 'archived',
          name: 'test newsletter 2',
          slug: 'test-newsletter2'
        });
        await (0, _visit.visit)('/settings/newsletters'); // Check total newsletters shown

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-newsletter]').length, 'Total newsletters shown').to.equal(1); // Go to archived newsletters

        await (0, _testHelpers.click)('[data-test-dropdown="newsletter-status-filter"] .ember-power-select-trigger');
        await (0, _testHelpers.click)('.ember-power-select-option[aria-selected="false"]'); // Check title okay

        (0, _chai.expect)((0, _testHelpers.find)('.gh-newsletters .gh-expandable-title').textContent.trim(), 'Title').to.equal('Archived newsletters'); // Check total newsletters shown

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-newsletter]').length, 'Total archived newsletters shown').to.equal(1); // Reactivate the newsletter

        await (0, _testHelpers.click)('[data-test-newsletter-menu-trigger]');
        await (0, _testHelpers.click)('[data-test-button="reactivate-newsletter"]'); // Check if confimation modal doesn't open

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="confirm-newsletter-reactivate"]'), 'Reactivate newsletter modal').not.to.exist; // Check limits modal is shown

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="limits/multiple-newsletters"]'), 'Limits modal').to.exist; // Check can close modal

        await (0, _testHelpers.click)('[data-test-button="cancel-upgrade"]'); // Check modal is closed

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="limits/multiple-newsletters"]'), 'Limits modal').not.to.exist;
      });
    });
  });
});
define("ghost-admin/tests/acceptance/settings/slack-test", ["ghost-admin/utils/ctrl-or-cmd", "miragejs", "ember-simple-auth/test-support", "mocha", "@ember/test-helpers", "chai", "ember-mocha", "ember-cli-mirage/test-support", "ghost-admin/tests/helpers/visit"], function (_ctrlOrCmd, _miragejs, _testSupport, _mocha, _testHelpers, _chai, _emberMocha, _testSupport2, _visit) {
  "use strict";

  (0, _mocha.describe)('Acceptance: Settings - Integrations - Slack', function () {
    let hooks = (0, _emberMocha.setupApplicationTest)();
    (0, _testSupport2.setupMirage)(hooks);
    (0, _mocha.it)('redirects to signin when not authenticated', async function () {
      await (0, _testSupport.invalidateSession)();
      await (0, _visit.visit)('/settings/integrations/slack');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/signin');
    });
    (0, _mocha.it)('redirects to home page when authenticated as contributor', async function () {
      let role = this.server.create('role', {
        name: 'Contributor'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/settings/integrations/slack');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/posts');
    });
    (0, _mocha.it)('redirects to home page when authenticated as author', async function () {
      let role = this.server.create('role', {
        name: 'Author'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/settings/integrations/slack');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/site');
    });
    (0, _mocha.it)('redirects to home page when authenticated as editor', async function () {
      let role = this.server.create('role', {
        name: 'Editor'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/settings/integrations/slack');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/site');
    });
    (0, _mocha.describe)('when logged in', function () {
      (0, _mocha.beforeEach)(async function () {
        let role = this.server.create('role', {
          name: 'Administrator'
        });
        this.server.create('user', {
          roles: [role]
        });
        return await (0, _testSupport.authenticateSession)();
      });
      (0, _mocha.it)('it validates and saves slack settings properly', async function () {
        await (0, _visit.visit)('/settings/integrations/slack'); // has correct url

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/integrations/slack');
        await (0, _testHelpers.fillIn)('[data-test-slack-url-input]', 'notacorrecturl');
        await (0, _testHelpers.click)('[data-test-save-button]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="slack-url"]').textContent.trim(), 'inline validation response').to.equal('The URL must be in a format like https://hooks.slack.com/services/<your personal key>'); // CMD-S shortcut works

        await (0, _testHelpers.fillIn)('[data-test-slack-url-input]', 'https://hooks.slack.com/services/1275958430');
        await (0, _testHelpers.fillIn)('[data-test-slack-username-input]', 'SlackBot');
        await (0, _testHelpers.triggerEvent)('.gh-app', 'keydown', {
          keyCode: 83,
          // s
          metaKey: _ctrlOrCmd.default === 'command',
          ctrlKey: _ctrlOrCmd.default === 'ctrl'
        });
        let [newRequest] = this.server.pretender.handledRequests.slice(-1);
        let params = JSON.parse(newRequest.requestBody);
        let urlResult = params.settings.findBy('key', 'slack_url').value;
        let usernameResult = params.settings.findBy('key', 'slack_username').value;
        (0, _chai.expect)(urlResult).to.equal('https://hooks.slack.com/services/1275958430');
        (0, _chai.expect)(usernameResult).to.equal('SlackBot');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="slack-url"]'), 'inline validation response').to.not.exist;
        await (0, _testHelpers.fillIn)('[data-test-slack-url-input]', 'https://hooks.slack.com/services/1275958430');
        await (0, _testHelpers.click)('[data-test-send-notification-button]');
        (0, _chai.expect)((0, _testHelpers.findAll)('.gh-notification').length, 'number of notifications').to.equal(1);
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="slack-url"]'), 'inline validation response').to.not.exist;
        this.server.put('/settings/', function () {
          return new _miragejs.Response(422, {}, {
            errors: [{
              type: 'ValidationError',
              message: 'Test error'
            }]
          });
        });
        await (0, _testHelpers.click)('.gh-notification .gh-notification-close');
        await (0, _testHelpers.click)('[data-test-send-notification-button]'); // we shouldn't try to send the test request if the save fails

        let [lastRequest] = this.server.pretender.handledRequests.slice(-1);
        (0, _chai.expect)(lastRequest.url).to.not.match(/\/slack\/test/);
        (0, _chai.expect)((0, _testHelpers.findAll)('.gh-notification').length, 'check slack notification after api validation error').to.equal(0);
      });
      (0, _mocha.it)('warns when leaving without saving', async function () {
        await (0, _visit.visit)('/settings/integrations/slack'); // has correct url

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/integrations/slack');
        await (0, _testHelpers.fillIn)('[data-test-slack-url-input]', 'https://hooks.slack.com/services/1275958430');
        await (0, _testHelpers.blur)('[data-test-slack-url-input]');
        await (0, _visit.visit)('/settings');
        (0, _chai.expect)((0, _testHelpers.findAll)('.fullscreen-modal').length, 'modal exists').to.equal(1); // Leave without saving

        await (0, _testHelpers.click)('.fullscreen-modal [data-test-leave-button]');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings');
        await (0, _visit.visit)('/settings/integrations/slack');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/integrations/slack'); // settings were not saved

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-slack-url-input]').textContent.trim(), 'Slack Webhook URL').to.equal('');
      });
    });
  });
});
define("ghost-admin/tests/acceptance/settings/tags-test", ["ghost-admin/utils/window-proxy", "miragejs", "mocha", "ember-simple-auth/test-support", "@ember/test-helpers", "chai", "ember-mocha", "ember-cli-mirage/test-support", "ember-concurrency", "ghost-admin/tests/helpers/visit"], function (_windowProxy, _miragejs, _mocha, _testSupport, _testHelpers, _chai, _emberMocha, _testSupport2, _emberConcurrency, _visit) {
  "use strict";

  // Grabbed from keymaster's testing code because Ember's `keyEvent` helper
  // is for some reason not triggering the events in a way that keymaster detects:
  // https://github.com/madrobby/keymaster/blob/master/test/keymaster.html#L31
  const modifierMap = {
    16: 'shiftKey',
    18: 'altKey',
    17: 'ctrlKey',
    91: 'metaKey'
  };

  let keydown = function (code, modifiers, el) {
    let event = document.createEvent('Event');
    event.initEvent('keydown', true, true);
    event.keyCode = code;

    if (modifiers && modifiers.length > 0) {
      for (let i in modifiers) {
        event[modifierMap[modifiers[i]]] = true;
      }
    }

    (el || document).dispatchEvent(event);
  };

  let keyup = function (code, el) {
    let event = document.createEvent('Event');
    event.initEvent('keyup', true, true);
    event.keyCode = code;
    (el || document).dispatchEvent(event);
  };

  _mocha.describe.skip('Acceptance: Tags', function () {
    let hooks = (0, _emberMocha.setupApplicationTest)();
    (0, _testSupport2.setupMirage)(hooks);
    (0, _mocha.it)('redirects to signin when not authenticated', async function () {
      await (0, _testSupport.invalidateSession)();
      await (0, _visit.visit)('/tags');
      (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/signin');
    });
    (0, _mocha.it)('redirects to staff page when authenticated as contributor', async function () {
      let role = this.server.create('role', {
        name: 'Contributor'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/settings/design');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/staff/test-user');
    });
    (0, _mocha.it)('redirects to staff page when authenticated as author', async function () {
      let role = this.server.create('role', {
        name: 'Author'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/settings/design');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/staff/test-user');
    });
    (0, _mocha.describe)('when logged in', function () {
      let newLocation, originalReplaceState;
      (0, _mocha.beforeEach)(async function () {
        let role = this.server.create('role', {
          name: 'Administrator'
        });
        this.server.create('user', {
          roles: [role]
        });
        originalReplaceState = _windowProxy.default.replaceState;

        _windowProxy.default.replaceState = function (params, title, url) {
          newLocation = url;
        };

        newLocation = undefined;
        return await (0, _testSupport.authenticateSession)();
      });
      (0, _mocha.afterEach)(function () {
        _windowProxy.default.replaceState = originalReplaceState;
      });
      (0, _mocha.it)('it renders, can be navigated, can edit, create & delete tags', async function () {
        let tag1 = this.server.create('tag');
        let tag2 = this.server.create('tag');
        await (0, _visit.visit)('/tags'); // it redirects to first tag
        // expect(currentURL(), 'currentURL').to.equal(`/tags/${tag1.slug}`);
        // it doesn't redirect to first tag

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/tags'); // it has correct page title

        (0, _chai.expect)(document.title, 'page title').to.equal('Tags - Test Blog'); // it highlights nav menu

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-nav="tags"]'), 'highlights nav menu item').to.have.class('active'); // it lists all tags

        (0, _chai.expect)((0, _testHelpers.findAll)('.tags-list .gh-tags-list-item').length, 'tag list count').to.equal(2);
        let tag = (0, _testHelpers.find)('.tags-list .gh-tags-list-item');
        (0, _chai.expect)(tag.querySelector('.gh-tag-list-name').textContent, 'tag list item title').to.equal(tag1.name); // it highlights selected tag
        // expect(find(`a[href="/ghost/tags/${tag1.slug}"]`), 'highlights selected tag')
        //     .to.have.class('active');

        await (0, _visit.visit)(`/tags/${tag1.slug}`); // second wait is needed for the tag details to settle
        // it shows selected tag form
        // expect(find('.tag-settings-pane h4').textContent, 'settings pane title')
        //     .to.equal('Tag settings');

        (0, _chai.expect)((0, _testHelpers.find)('.gh-tag-basic-settings-form input[name="name"]').value, 'loads correct tag into form').to.equal(tag1.name); // click the second tag in the list
        // let tagEditButtons = findAll('.tag-edit-button');
        // await click(tagEditButtons[tagEditButtons.length - 1]);
        // it navigates to selected tag
        // expect(currentURL(), 'url after clicking tag').to.equal(`/tags/${tag2.slug}`);
        // it highlights selected tag
        // expect(find(`a[href="/ghost/tags/${tag2.slug}"]`), 'highlights selected tag')
        //     .to.have.class('active');
        // it shows selected tag form
        // expect(find('.tag-settings-pane input[name="name"]').value, 'loads correct tag into form')
        //     .to.equal(tag2.name);
        // simulate up arrow press

        Ember.run(() => {
          keydown(38);
          keyup(38);
        });
        await (0, _testHelpers.settled)(); // it navigates to previous tag

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'url after keyboard up arrow').to.equal(`/tags/${tag1.slug}`); // it highlights selected tag
        // expect(find(`a[href="/ghost/tags/${tag1.slug}"]`), 'selects previous tag')
        //     .to.have.class('active');
        // simulate down arrow press

        Ember.run(() => {
          keydown(40);
          keyup(40);
        });
        await (0, _testHelpers.settled)(); // it navigates to previous tag

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'url after keyboard down arrow').to.equal(`/tags/${tag2.slug}`); // it highlights selected tag
        // expect(find(`a[href="/ghost/tags/${tag2.slug}"]`), 'selects next tag')
        //     .to.have.class('active');
        // trigger save

        await (0, _testHelpers.fillIn)('.tag-settings-pane input[name="name"]', 'New Name');
        await (0, _testHelpers.blur)('.tag-settings-pane input[name="name"]'); // extra timeout needed for Travis - sometimes it doesn't update
        // quick enough and an extra wait() call doesn't help

        await (0, _emberConcurrency.timeout)(100); // check we update with the data returned from the server

        let tags = (0, _testHelpers.findAll)('.settings-tags .settings-tag');
        tag = tags[0];
        (0, _chai.expect)(tag.querySelector('.tag-title').textContent, 'tag list updates on save').to.equal('New Name');
        (0, _chai.expect)((0, _testHelpers.find)('.tag-settings-pane input[name="name"]').value, 'settings form updates on save').to.equal('New Name'); // start new tag

        await (0, _testHelpers.click)('.view-actions .gh-btn-green'); // it navigates to the new tag route

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'new tag URL').to.equal('/tags/new'); // it displays the new tag form

        (0, _chai.expect)((0, _testHelpers.find)('.tag-settings-pane h4').textContent, 'settings pane title').to.equal('New tag'); // all fields start blank

        (0, _testHelpers.findAll)('.tag-settings-pane input, .tag-settings-pane textarea').forEach(function (elem) {
          (0, _chai.expect)(elem.value, `input field for ${elem.getAttribute('name')}`).to.be.empty;
        }); // save new tag

        await (0, _testHelpers.fillIn)('.tag-settings-pane input[name="name"]', 'New tag');
        await (0, _testHelpers.blur)('.tag-settings-pane input[name="name"]'); // extra timeout needed for FF on Linux - sometimes it doesn't update
        // quick enough, especially on Travis, and an extra wait() call
        // doesn't help

        await (0, _emberConcurrency.timeout)(100); // it redirects to the new tag's URL

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'URL after tag creation').to.equal('/tags/new-tag'); // it adds the tag to the list and selects

        tags = (0, _testHelpers.findAll)('.settings-tags .settings-tag');
        tag = tags[1]; // second tag in list due to alphabetical ordering

        (0, _chai.expect)(tags.length, 'tag list count after creation').to.equal(3); // new tag will be second in the list due to alphabetical sorting

        (0, _chai.expect)((0, _testHelpers.findAll)('.settings-tags .settings-tag')[1].querySelector('.tag-title').textContent.trim(), 'new tag list item title');
        (0, _chai.expect)(tag.querySelector('.tag-title').textContent, 'new tag list item title').to.equal('New tag');
        (0, _chai.expect)((0, _testHelpers.find)('a[href="/ghost/tags/new-tag"]'), 'highlights new tag').to.have.class('active'); // delete tag

        await (0, _testHelpers.click)('.settings-menu-delete-button');
        await (0, _testHelpers.click)('.fullscreen-modal .gh-btn-red'); // it redirects to the first tag

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'URL after tag deletion').to.equal(`/tags/${tag1.slug}`); // it removes the tag from the list

        (0, _chai.expect)((0, _testHelpers.findAll)('.settings-tags .settings-tag').length, 'tag list count after deletion').to.equal(2);
      }); // TODO: Unskip and fix
      // skipped because it was failing most of the time on Travis
      // see https://github.com/TryGhost/Ghost/issues/8805

      _mocha.it.skip('loads tag via slug when accessed directly', async function () {
        this.server.createList('tag', 2);
        await (0, _visit.visit)('/tags/tag-1');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'URL after direct load').to.equal('/tags/tag-1'); // it loads all other tags

        (0, _chai.expect)((0, _testHelpers.findAll)('.settings-tags .settings-tag').length, 'tag list count after direct load').to.equal(2); // selects tag in list

        (0, _chai.expect)((0, _testHelpers.find)('a[href="/ghost/tags/tag-1"]').classList.contains('active'), 'highlights requested tag').to.be.true; // shows requested tag in settings pane

        (0, _chai.expect)((0, _testHelpers.find)('.tag-settings-pane input[name="name"]').value, 'loads correct tag into form').to.equal('Tag 1');
      });

      (0, _mocha.it)('shows the internal tag label', async function () {
        this.server.create('tag', {
          name: '#internal-tag',
          slug: 'hash-internal-tag',
          visibility: 'internal'
        });
        await (0, _visit.visit)('tags/');
        (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/tags/hash-internal-tag');
        (0, _chai.expect)((0, _testHelpers.findAll)('.settings-tags .settings-tag').length, 'tag list count').to.equal(1);
        let tag = (0, _testHelpers.find)('.settings-tags .settings-tag');
        (0, _chai.expect)(tag.querySelectorAll('.label.label-blue').length, 'internal tag label').to.equal(1);
        (0, _chai.expect)(tag.querySelector('.label.label-blue').textContent.trim(), 'internal tag label text').to.equal('internal');
      });
      (0, _mocha.it)('updates the URL when slug changes', async function () {
        this.server.createList('tag', 2);
        await (0, _visit.visit)('/tags/tag-1');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'URL after direct load').to.equal('/tags/tag-1'); // update the slug

        await (0, _testHelpers.fillIn)('.tag-settings-pane input[name="slug"]', 'test');
        await (0, _testHelpers.blur)('.tag-settings-pane input[name="slug"]'); // tests don't have a location.hash so we can only check that the
        // slug portion is updated correctly

        (0, _chai.expect)(newLocation, 'URL after slug change').to.equal('test');
      });
      (0, _mocha.it)('redirects to 404 when tag does not exist', async function () {
        this.server.get('/tags/slug/unknown/', function () {
          return new _miragejs.Response(404, {
            'Content-Type': 'application/json'
          }, {
            errors: [{
              message: 'Tag not found.',
              type: 'NotFoundError'
            }]
          });
        });
        await (0, _visit.visit)('tags/unknown');
        (0, _chai.expect)((0, _testHelpers.currentRouteName)()).to.equal('error404');
        (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/tags/unknown');
      });
      (0, _mocha.it)('sorts tags correctly', async function () {
        this.server.create('tag', {
          name: 'B - Third',
          slug: 'third'
        });
        this.server.create('tag', {
          name: 'Z - Last',
          slug: 'last'
        });
        this.server.create('tag', {
          name: '#A - Second',
          slug: 'second'
        });
        this.server.create('tag', {
          name: 'A - First',
          slug: 'first'
        });
        await (0, _visit.visit)('tags');
        let tags = (0, _testHelpers.findAll)('[data-test-tag]');
        (0, _chai.expect)(tags[0].querySelector('[data-test-name]').textContent.trim()).to.equal('A - First');
        (0, _chai.expect)(tags[1].querySelector('[data-test-name]').textContent.trim()).to.equal('#A - Second');
        (0, _chai.expect)(tags[2].querySelector('[data-test-name]').textContent.trim()).to.equal('B - Third');
        (0, _chai.expect)(tags[3].querySelector('[data-test-name]').textContent.trim()).to.equal('Z - Last');
      });
    });
  });
});
define("ghost-admin/tests/acceptance/settings/unsplash-test", ["ghost-admin/utils/ctrl-or-cmd", "ember-simple-auth/test-support", "mocha", "@ember/test-helpers", "chai", "ember-mocha", "ember-cli-mirage/test-support", "ghost-admin/tests/helpers/visit"], function (_ctrlOrCmd, _testSupport, _mocha, _testHelpers, _chai, _emberMocha, _testSupport2, _visit) {
  "use strict";

  (0, _mocha.describe)('Acceptance: Settings - Integrations - Unsplash', function () {
    let hooks = (0, _emberMocha.setupApplicationTest)();
    (0, _testSupport2.setupMirage)(hooks);
    (0, _mocha.it)('redirects to signin when not authenticated', async function () {
      await (0, _testSupport.invalidateSession)();
      await (0, _visit.visit)('/settings/integrations/unsplash');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/signin');
    });
    (0, _mocha.it)('redirects to home page when authenticated as contributor', async function () {
      let role = this.server.create('role', {
        name: 'Contributor'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/settings/integrations/unsplash');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/posts');
    });
    (0, _mocha.it)('redirects to home page when authenticated as author', async function () {
      let role = this.server.create('role', {
        name: 'Author'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/settings/integrations/unsplash');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/site');
    });
    (0, _mocha.it)('redirects to home page when authenticated as editor', async function () {
      let role = this.server.create('role', {
        name: 'Editor'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/settings/integrations/unsplash');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/site');
    });
    (0, _mocha.describe)('when logged in', function () {
      (0, _mocha.beforeEach)(async function () {
        let role = this.server.create('role', {
          name: 'Administrator'
        });
        this.server.create('user', {
          roles: [role]
        });
        return await (0, _testSupport.authenticateSession)();
      });
      (0, _mocha.it)('it can activate/deactivate', async function () {
        await (0, _visit.visit)('/settings/integrations/unsplash'); // has correct url

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/integrations/unsplash'); // it's enabled by default when settings is empty

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-unsplash-checkbox]').checked, 'checked by default').to.be.true;
        await (0, _testHelpers.click)('[data-test-unsplash-checkbox]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-unsplash-checkbox]').checked, 'unsplash checkbox').to.be.false; // trigger a save

        await (0, _testHelpers.click)('[data-test-save-button]'); // server should now have an unsplash setting

        let [lastRequest] = this.server.pretender.handledRequests.slice(-1);
        let params = JSON.parse(lastRequest.requestBody);
        (0, _chai.expect)(params.settings.findBy('key', 'unsplash').value).to.equal(false); // save via CMD-S shortcut

        await (0, _testHelpers.click)('[data-test-unsplash-checkbox]');
        await (0, _testHelpers.triggerEvent)('.gh-app', 'keydown', {
          keyCode: 83,
          // s
          metaKey: _ctrlOrCmd.default === 'command',
          ctrlKey: _ctrlOrCmd.default === 'ctrl'
        }); // we've already saved in this test so there's no on-screen indication
        // that we've had another save, check the request was fired instead

        let [newRequest] = this.server.pretender.handledRequests.slice(-1);
        params = JSON.parse(newRequest.requestBody);
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-unsplash-checkbox]').checked, 'AMP checkbox').to.be.true;
        (0, _chai.expect)(params.settings.findBy('key', 'unsplash').value).to.equal(true);
      });
      (0, _mocha.it)('warns when leaving without saving', async function () {
        await (0, _visit.visit)('/settings/integrations/unsplash'); // has correct url

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/integrations/unsplash'); // AMP is enabled by default

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-unsplash-checkbox]').checked, 'AMP checkbox default').to.be.true;
        await (0, _testHelpers.click)('[data-test-unsplash-checkbox]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-unsplash-checkbox]').checked, 'Unsplash checkbox').to.be.false;
        await (0, _visit.visit)('/settings/labs');
        (0, _chai.expect)((0, _testHelpers.findAll)('.fullscreen-modal').length, 'unsaved changes modal exists').to.equal(1); // Leave without saving

        await (0, _testHelpers.click)('.fullscreen-modal [data-test-leave-button]');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL after leave without saving').to.equal('/settings/labs');
        await (0, _visit.visit)('/settings/integrations/unsplash');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/integrations/unsplash'); // settings were not saved

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-unsplash-checkbox]').checked, 'Unsplash checkbox').to.be.true;
      });
    });
  });
});
define("ghost-admin/tests/acceptance/settings/zapier-test", ["ember-simple-auth/test-support", "mocha", "@ember/test-helpers", "chai", "ember-mocha", "ember-cli-mirage/test-support", "ghost-admin/tests/helpers/visit"], function (_testSupport, _mocha, _testHelpers, _chai, _emberMocha, _testSupport2, _visit) {
  "use strict";

  (0, _mocha.describe)('Acceptance: Settings - Integrations - Zapier', function () {
    let hooks = (0, _emberMocha.setupApplicationTest)();
    (0, _testSupport2.setupMirage)(hooks);
    (0, _mocha.it)('redirects to signin when not authenticated', async function () {
      await (0, _testSupport.invalidateSession)();
      await (0, _visit.visit)('/settings/integrations/zapier');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/signin');
    });
    (0, _mocha.it)('redirects to home page when authenticated as contributor', async function () {
      let role = this.server.create('role', {
        name: 'Contributor'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/settings/integrations/zapier');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/posts');
    });
    (0, _mocha.it)('redirects to home page when authenticated as author', async function () {
      let role = this.server.create('role', {
        name: 'Author'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/settings/integrations/zapier');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/site');
    });
    (0, _mocha.it)('redirects to home page when authenticated as editor', async function () {
      let role = this.server.create('role', {
        name: 'Editor'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/settings/integrations/zapier');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/site');
    });
    (0, _mocha.describe)('when logged in', function () {
      (0, _mocha.beforeEach)(async function () {
        let role = this.server.create('role', {
          name: 'Administrator'
        });
        this.server.create('user', {
          roles: [role]
        });
        return await (0, _testSupport.authenticateSession)();
      });
      (0, _mocha.it)('it loads', async function () {
        await (0, _visit.visit)('/settings/integrations/zapier'); // has correct url

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/integrations/zapier');
      });
    });
  });
});
define("ghost-admin/tests/acceptance/setup-test", ["miragejs", "ember-simple-auth/test-support", "mocha", "@ember/test-helpers", "chai", "ember-mocha", "ember-cli-mirage/test-support", "ghost-admin/tests/helpers/visit"], function (_miragejs, _testSupport, _mocha, _testHelpers, _chai, _emberMocha, _testSupport2, _visit) {
  "use strict";

  (0, _mocha.describe)('Acceptance: Setup', function () {
    let hooks = (0, _emberMocha.setupApplicationTest)();
    (0, _testSupport2.setupMirage)(hooks);
    (0, _mocha.it)('redirects if already authenticated', async function () {
      let role = this.server.create('role', {
        name: 'Author'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/setup');
      (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/site');
    });
    (0, _mocha.it)('redirects to signin if already set up', async function () {
      // mimick an already setup blog
      this.server.get('/authentication/setup/', function () {
        return {
          setup: [{
            status: true
          }]
        };
      });
      await (0, _testSupport.invalidateSession)();
      await (0, _visit.visit)('/setup');
      (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/signin');
    });
    (0, _mocha.describe)('with a new blog', function () {
      (0, _mocha.beforeEach)(function () {
        // mimick a new blog
        this.server.get('/authentication/setup/', function () {
          return {
            setup: [{
              status: false
            }]
          };
        });
      });
      (0, _mocha.it)('has a successful happy path', async function () {
        await (0, _testSupport.invalidateSession)();
        this.server.loadFixtures('roles');
        await (0, _visit.visit)('/setup'); // email field is focused by default
        // NOTE: $('x').is(':focus') doesn't work in phantomjs CLI runner
        // https://github.com/ariya/phantomjs/issues/10427

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-blog-title-input]')[0] === document.activeElement, 'blog title has focus').to.be.true;
        await (0, _testHelpers.click)('[data-test-button="setup"]'); // it marks fields as invalid

        (0, _chai.expect)((0, _testHelpers.findAll)('.form-group.error').length, 'number of invalid fields').to.equal(4); // it displays error messages

        (0, _chai.expect)((0, _testHelpers.findAll)('.error .response').length, 'number of in-line validation messages').to.equal(4); // it displays main error

        (0, _chai.expect)((0, _testHelpers.findAll)('.main-error').length, 'main error is displayed').to.equal(1); // enter valid details and submit

        await (0, _testHelpers.fillIn)('[data-test-email-input]', 'test@example.com');
        await (0, _testHelpers.fillIn)('[data-test-name-input]', 'Test User');
        await (0, _testHelpers.fillIn)('[data-test-password-input]', 'thisissupersafe');
        await (0, _testHelpers.fillIn)('[data-test-blog-title-input]', 'Blog Title');
        await (0, _testHelpers.click)('[data-test-button="setup"]'); // it redirects to the dashboard

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'url after submitting account details').to.equal('/setup/done');
      });
      (0, _mocha.it)('handles validation errors in setup', async function () {
        let postCount = 0;
        await (0, _testSupport.invalidateSession)();
        this.server.loadFixtures('roles');
        this.server.post('/authentication/setup', function () {
          postCount += 1; // validation error

          if (postCount === 1) {
            return new _miragejs.Response(422, {}, {
              errors: [{
                type: 'ValidationError',
                message: 'Server response message'
              }]
            });
          } // server error


          if (postCount === 2) {
            return new _miragejs.Response(500, {}, null);
          }
        });
        await (0, _visit.visit)('/setup');
        await (0, _testHelpers.click)('[data-test-button="setup"]'); // non-server validation

        (0, _chai.expect)((0, _testHelpers.find)('.main-error').textContent.trim(), 'error text').to.not.be.empty;
        await (0, _testHelpers.fillIn)('[data-test-email-input]', 'test@example.com');
        await (0, _testHelpers.fillIn)('[data-test-name-input]', 'Test User');
        await (0, _testHelpers.fillIn)('[data-test-password-input]', 'thisissupersafe');
        await (0, _testHelpers.fillIn)('[data-test-blog-title-input]', 'Blog Title'); // first post - simulated validation error

        await (0, _testHelpers.click)('[data-test-button="setup"]');
        (0, _chai.expect)((0, _testHelpers.find)('.main-error').textContent.trim(), 'error text').to.equal('Server response message'); // second post - simulated server error

        await (0, _testHelpers.click)('[data-test-button="setup"]');
        (0, _chai.expect)((0, _testHelpers.findAll)('.main-error').length, 'main error is not displayed').to.equal(0);
        (0, _chai.expect)((0, _testHelpers.findAll)('.gh-alert-red').length, 'number of alerts').to.equal(1);
      });
      (0, _mocha.it)('handles invalid origin error on setup', async function () {
        // mimick the API response for an invalid origin
        this.server.post('/session', function () {
          return new _miragejs.Response(401, {}, {
            errors: [{
              type: 'UnauthorizedError',
              message: 'Access Denied from url: unknown.com. Please use the url configured in config.js.'
            }]
          });
        });
        await (0, _testSupport.invalidateSession)();
        this.server.loadFixtures('roles');
        await (0, _visit.visit)('/setup');
        await (0, _testHelpers.fillIn)('[data-test-email-input]', 'test@example.com');
        await (0, _testHelpers.fillIn)('[data-test-name-input]', 'Test User');
        await (0, _testHelpers.fillIn)('[data-test-password-input]', 'thisissupersafe');
        await (0, _testHelpers.fillIn)('[data-test-blog-title-input]', 'Blog Title');
        await (0, _testHelpers.click)('[data-test-button="setup"]'); // button should not be spinning

        (0, _chai.expect)((0, _testHelpers.findAll)('.gh-btn-signup .spinner').length, 'button has spinner').to.equal(0); // we should show an error message

        (0, _chai.expect)((0, _testHelpers.find)('.main-error').textContent, 'error text').to.have.string('Access Denied from url: unknown.com. Please use the url configured in config.js.');
      });
    });
    (0, _mocha.describe)('?firstStart=true', function () {
      (0, _mocha.beforeEach)(async function () {
        let role = this.server.create('role', {
          name: 'Owner'
        });
        this.server.create('user', {
          roles: [role],
          slug: 'owner'
        });
        await (0, _testSupport.authenticateSession)();
      });
      (0, _mocha.it)('transitions to done screen', async function () {
        await (0, _visit.visit)('/?firstStart=true');
        (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/setup/done');
      });
    });
  });
});
define("ghost-admin/tests/acceptance/signin-test", ["miragejs", "ember-simple-auth/test-support", "mocha", "@ember/test-helpers", "chai", "ember-mocha", "ember-cli-mirage/test-support", "ghost-admin/tests/helpers/visit"], function (_miragejs, _testSupport, _mocha, _testHelpers, _chai, _emberMocha, _testSupport2, _visit) {
  "use strict";

  (0, _mocha.describe)('Acceptance: Signin', function () {
    let hooks = (0, _emberMocha.setupApplicationTest)();
    (0, _testSupport2.setupMirage)(hooks);
    (0, _mocha.it)('redirects if already authenticated', async function () {
      let role = this.server.create('role', {
        name: 'Author'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/signin');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'current url').to.equal('/site');
    });
    (0, _mocha.describe)('when attempting to signin', function () {
      (0, _mocha.beforeEach)(function () {
        let role = this.server.create('role', {
          name: 'Administrator'
        });
        this.server.create('user', {
          roles: [role],
          slug: 'test-user'
        });
        this.server.post('/session', function (schema, _ref) {
          let {
            requestBody
          } = _ref;
          let {
            username,
            password
          } = JSON.parse(requestBody);
          (0, _chai.expect)(username).to.equal('test@example.com');

          if (password === 'thisissupersafe') {
            return new _miragejs.Response(201);
          } else {
            return new _miragejs.Response(401, {}, {
              errors: [{
                type: 'UnauthorizedError',
                message: 'Invalid Password'
              }]
            });
          }
        });
      });
      (0, _mocha.it)('errors correctly', async function () {
        await (0, _testSupport.invalidateSession)();
        await (0, _visit.visit)('/signin');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'signin url').to.equal('/signin');
        (0, _chai.expect)((0, _testHelpers.findAll)('input[name="identification"]').length, 'email input field').to.equal(1);
        (0, _chai.expect)((0, _testHelpers.findAll)('input[name="password"]').length, 'password input field').to.equal(1);
        await (0, _testHelpers.click)('.js-login-button');
        (0, _chai.expect)((0, _testHelpers.findAll)('.form-group.error').length, 'number of invalid fields').to.equal(2);
        (0, _chai.expect)((0, _testHelpers.findAll)('.main-error').length, 'main error is displayed').to.equal(1);
        await (0, _testHelpers.fillIn)('[name="identification"]', 'test@example.com');
        await (0, _testHelpers.fillIn)('[name="password"]', 'invalid');
        await (0, _testHelpers.click)('.js-login-button');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'current url').to.equal('/signin');
        (0, _chai.expect)((0, _testHelpers.findAll)('.main-error').length, 'main error is displayed').to.equal(1);
        (0, _chai.expect)((0, _testHelpers.find)('.main-error').textContent.trim(), 'main error text').to.equal('Invalid Password');
      });
      (0, _mocha.it)('submits successfully', async function () {
        (0, _testSupport.invalidateSession)();
        await (0, _visit.visit)('/signin');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'current url').to.equal('/signin');
        await (0, _testHelpers.fillIn)('[name="identification"]', 'test@example.com');
        await (0, _testHelpers.fillIn)('[name="password"]', 'thisissupersafe');
        await (0, _testHelpers.click)('.js-login-button');
        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/dashboard');
      });
    });
  });
});
define("ghost-admin/tests/acceptance/signup-test", ["ember-simple-auth/test-support", "@ember/test-helpers", "mocha", "chai", "ember-mocha", "ember-cli-mirage/test-support", "ghost-admin/tests/helpers/visit"], function (_testSupport, _testHelpers, _mocha, _chai, _emberMocha, _testSupport2, _visit) {
  "use strict";

  (0, _mocha.describe)('Acceptance: Signup', function () {
    let hooks = (0, _emberMocha.setupApplicationTest)();
    (0, _testSupport2.setupMirage)(hooks);
    (0, _mocha.it)('can signup successfully', async function () {
      let server = this.server;
      server.get('/authentication/invitation', function () {
        return {
          invitation: [{
            valid: true
          }]
        };
      });
      server.post('/authentication/invitation/', function (_ref, _ref2) {
        let {
          users
        } = _ref;
        let {
          requestBody
        } = _ref2;
        let params = JSON.parse(requestBody);
        (0, _chai.expect)(params.invitation[0].name).to.equal('Test User');
        (0, _chai.expect)(params.invitation[0].email).to.equal('kevin+test2@ghost.org');
        (0, _chai.expect)(params.invitation[0].password).to.equal('thisissupersafe');
        (0, _chai.expect)(params.invitation[0].token).to.equal('MTQ3MDM0NjAxNzkyOXxrZXZpbit0ZXN0MkBnaG9zdC5vcmd8MmNEblFjM2c3ZlFUajluTks0aUdQU0dmdm9ta0xkWGY2OEZ1V2dTNjZVZz0'); // ensure that `/users/me/` request returns a user

        let role = server.create('role', {
          name: 'Author'
        });
        users.create({
          email: 'kevin@test2@ghost.org',
          roles: [role]
        });
        return {
          invitation: [{
            message: 'Invitation accepted.'
          }]
        };
      }); // token details:
      // "1470346017929|kevin+test2@ghost.org|2cDnQc3g7fQTj9nNK4iGPSGfvomkLdXf68FuWgS66Ug="

      await (0, _visit.visit)('/signup/MTQ3MDM0NjAxNzkyOXxrZXZpbit0ZXN0MkBnaG9zdC5vcmd8MmNEblFjM2c3ZlFUajluTks0aUdQU0dmdm9ta0xkWGY2OEZ1V2dTNjZVZz0');
      (0, _chai.expect)((0, _testHelpers.currentRouteName)()).to.equal('signup'); // focus out in Name field triggers inline error

      await (0, _testHelpers.focus)('[data-test-input="name"]');
      await (0, _testHelpers.blur)('[data-test-input="name"]');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="name"]').closest('.form-group'), 'name field group has error class when empty').to.have.class('error');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="name"]').closest('.form-group').querySelector('.response').textContent, 'name inline-error text').to.have.string('Please enter a name'); // entering text in Name field clears error

      await (0, _testHelpers.fillIn)('[data-test-input="name"]', 'Test User');
      await (0, _testHelpers.blur)('[data-test-input="name"]');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="name"]').closest('.form-group'), 'name field loses error class after text input').to.not.have.class('error');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="name"]').closest('.form-group').querySelector('.response').textContent.trim(), 'name field error is removed after text input').to.be.empty; // focus out in Email field triggers inline error

      await (0, _testHelpers.click)('[data-test-input="email"]');
      await (0, _testHelpers.blur)('[data-test-input="email"]');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="email"]').closest('.form-group'), 'email field group has error class when empty').to.have.class('error');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="email"]').closest('.form-group').querySelector('.response').textContent, 'email inline-error text').to.have.string('Please enter an email'); // entering text in email field clears error

      await (0, _testHelpers.fillIn)('[data-test-input="email"]', 'kevin+test2@ghost.org');
      await (0, _testHelpers.blur)('[data-test-input="email"]');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="email"]').closest('.form-group'), 'email field loses error class after text input').to.not.have.class('error');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="email"]').closest('.form-group').querySelector('.response').textContent.trim(), 'email field error is removed after text input').to.be.empty; // check password validation
      // focus out in password field triggers inline error
      // no password

      await (0, _testHelpers.click)('[data-test-input="password"]');
      await (0, _testHelpers.blur)();
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="password"]').closest('.form-group'), 'password field group has error class when empty').to.have.class('error');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="password"]').closest('.form-group').querySelector('.response').textContent, 'password field error text').to.have.string('must be at least 10 characters'); // password too short

      await (0, _testHelpers.fillIn)('[data-test-input="password"]', 'short');
      await (0, _testHelpers.blur)('[data-test-input="password"]');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="password"]').closest('.form-group').querySelector('.response').textContent, 'password field error text').to.have.string('must be at least 10 characters'); // password must not be a bad password

      await (0, _testHelpers.fillIn)('[data-test-input="password"]', '1234567890');
      await (0, _testHelpers.blur)('[data-test-input="password"]');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="password"]').closest('.form-group').querySelector('.response').textContent, 'password field error text').to.have.string('you cannot use an insecure password'); // password must not be a disallowed password

      await (0, _testHelpers.fillIn)('[data-test-input="password"]', 'password99');
      await (0, _testHelpers.blur)('[data-test-input="password"]');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="password"]').closest('.form-group').querySelector('.response').textContent, 'password field error text').to.have.string('you cannot use an insecure password'); // password must not have repeating characters

      await (0, _testHelpers.fillIn)('[data-test-input="password"]', '2222222222');
      await (0, _testHelpers.blur)('[data-test-input="password"]');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="password"]').closest('.form-group').querySelector('.response').textContent, 'password field error text').to.have.string('you cannot use an insecure password'); // entering valid text in Password field clears error

      await (0, _testHelpers.fillIn)('[data-test-input="password"]', 'thisissupersafe');
      await (0, _testHelpers.blur)('[data-test-input="password"]');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="password"]').closest('.form-group'), 'password field loses error class after text input').to.not.have.class('error');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-input="password"]').closest('.form-group').querySelector('.response').textContent.trim(), 'password field error is removed after text input').to.equal(''); // submitting sends correct details and redirects to content screen

      await (0, _testHelpers.click)('[data-test-button="signup"]');
      (0, _chai.expect)((0, _testHelpers.currentRouteName)()).to.equal('site');
    });
    (0, _mocha.it)('redirects if already logged in', async function () {
      this.server.get('/authentication/invitation', function () {
        return {
          invitation: [{
            valid: true
          }]
        };
      });
      let role = this.server.create('role', {
        name: 'Author'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      await (0, _testSupport.authenticateSession)(); // token details:
      // "1470346017929|kevin+test2@ghost.org|2cDnQc3g7fQTj9nNK4iGPSGfvomkLdXf68FuWgS66Ug="

      await (0, _visit.visit)('/signup/MTQ3MDM0NjAxNzkyOXxrZXZpbit0ZXN0MkBnaG9zdC5vcmd8MmNEblFjM2c3ZlFUajluTks0aUdQU0dmdm9ta0xkWGY2OEZ1V2dTNjZVZz0');
      (0, _chai.expect)((0, _testHelpers.currentRouteName)()).to.equal('site');
      (0, _chai.expect)((0, _testHelpers.find)('.gh-alert-content').textContent).to.have.string('sign out to register');
    });
    (0, _mocha.it)('redirects with alert on invalid token', async function () {
      await (0, _testSupport.invalidateSession)();
      await (0, _visit.visit)('/signup/---invalid---');
      (0, _chai.expect)((0, _testHelpers.currentRouteName)()).to.equal('signin');
      (0, _chai.expect)((0, _testHelpers.find)('.gh-alert-content').textContent).to.have.string('Invalid token');
    });
    (0, _mocha.it)('redirects with alert on non-existant or expired token', async function () {
      this.server.get('/authentication/invitation', function () {
        return {
          invitation: [{
            valid: false
          }]
        };
      });
      await (0, _testSupport.invalidateSession)();
      await (0, _visit.visit)('/signup/expired');
      (0, _chai.expect)((0, _testHelpers.currentRouteName)()).to.equal('signin');
      (0, _chai.expect)((0, _testHelpers.find)('.gh-alert-content').textContent).to.have.string('not exist');
    });
  });
});
define("ghost-admin/tests/acceptance/staff-test", ["ghost-admin/utils/ctrl-or-cmd", "moment", "ghost-admin/utils/window-proxy", "miragejs", "mocha", "ember-simple-auth/test-support", "@ember/test-helpers", "chai", "ember-mocha", "ember-cli-mirage/test-support", "ghost-admin/tests/helpers/visit"], function (_ctrlOrCmd, _moment, _windowProxy, _miragejs, _mocha, _testSupport, _testHelpers, _chai, _emberMocha, _testSupport2, _visit) {
  "use strict";

  (0, _mocha.describe)('Acceptance: Staff', function () {
    let hooks = (0, _emberMocha.setupApplicationTest)();
    (0, _testSupport2.setupMirage)(hooks);
    (0, _mocha.it)('redirects to signin when not authenticated', async function () {
      await (0, _testSupport.invalidateSession)();
      await (0, _visit.visit)('/settings/staff');
      (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/signin');
    });
    (0, _mocha.it)('redirects correctly when authenticated as contributor', async function () {
      let role = this.server.create('role', {
        name: 'Contributor'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      this.server.create('user', {
        slug: 'no-access'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/settings/staff/no-access');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/staff/test-user');
    });
    (0, _mocha.it)('redirects correctly when authenticated as author', async function () {
      let role = this.server.create('role', {
        name: 'Author'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      this.server.create('user', {
        slug: 'no-access'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/settings/staff/no-access');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/staff/test-user');
    });
    (0, _mocha.it)('redirects correctly when authenticated as editor', async function () {
      let role = this.server.create('role', {
        name: 'Editor'
      });
      this.server.create('user', {
        roles: [role],
        slug: 'test-user'
      });
      this.server.create('user', {
        slug: 'no-access'
      });
      await (0, _testSupport.authenticateSession)();
      await (0, _visit.visit)('/settings/staff/no-access');
      (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/staff');
    });
    (0, _mocha.describe)('when logged in as admin', function () {
      let admin, adminRole, suspendedUser;
      (0, _mocha.beforeEach)(async function () {
        this.server.loadFixtures('roles');
        adminRole = this.server.schema.roles.find(1);
        admin = this.server.create('user', {
          email: 'admin@example.com',
          roles: [adminRole]
        }); // add an expired invite

        this.server.create('invite', {
          expires: _moment.default.utc().subtract(1, 'day').valueOf(),
          role: adminRole
        }); // add a suspended user

        suspendedUser = this.server.create('user', {
          email: 'suspended@example.com',
          roles: [adminRole],
          status: 'inactive'
        });
        return await (0, _testSupport.authenticateSession)();
      });
      (0, _mocha.it)('it renders and navigates correctly', async function () {
        let user1 = this.server.create('user');
        let user2 = this.server.create('user');
        await (0, _visit.visit)('/settings/staff'); // doesn't do any redirecting

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/staff'); // it has correct page title

        (0, _chai.expect)(document.title, 'page title').to.equal('Staff - Test Blog'); // it shows active users in active section

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-active-users] [data-test-user-id]').length, 'number of active users').to.equal(3);
        (0, _chai.expect)((0, _testHelpers.find)(`[data-test-active-users] [data-test-user-id="${user1.id}"]`)).to.exist;
        (0, _chai.expect)((0, _testHelpers.find)(`[data-test-active-users] [data-test-user-id="${user2.id}"]`)).to.exist;
        (0, _chai.expect)((0, _testHelpers.find)(`[data-test-active-users] [data-test-user-id="${admin.id}"]`)).to.exist; // it shows suspended users in suspended section

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-suspended-users] [data-test-user-id]').length, 'number of suspended users').to.equal(1);
        (0, _chai.expect)((0, _testHelpers.find)(`[data-test-suspended-users] [data-test-user-id="${suspendedUser.id}"]`)).to.exist;
        await (0, _testHelpers.click)(`[data-test-user-id="${user2.id}"]`); // url is correct

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'url after clicking user').to.equal(`/settings/staff/${user2.slug}`); // title is correct

        (0, _chai.expect)(document.title, 'title after clicking user').to.equal('Staff - User - Test Blog'); // view title should exist and be linkable and active

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-screen-title] a[href="/ghost/settings/staff"]').classList.contains('active'), 'has linkable url back to staff main page').to.be.true;
        await (0, _testHelpers.click)('[data-test-screen-title] a'); // url should be /staff again

        (0, _chai.expect)((0, _testHelpers.currentURL)(), 'url after clicking back').to.equal('/settings');
      });
      (0, _mocha.it)('can manage invites', async function () {
        await (0, _visit.visit)('/settings/staff'); // invite user button exists

        (0, _chai.expect)((0, _testHelpers.find)('.view-actions .gh-btn-primary'), 'invite people button').to.exist; // existing users are listed

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-user-id]').length, 'initial number of active users').to.equal(2);
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-user-id="1"] [data-test-role-name]').textContent.trim(), 'active user\'s role label').to.equal('Administrator'); // existing invites are shown

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-invite-id]').length, 'initial number of invited users').to.equal(1);
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-invite-id="1"] [data-test-invite-description]').textContent, 'expired invite description').to.match(/expired/); // remove expired invite

        await (0, _testHelpers.click)('[data-test-invite-id="1"] [data-test-revoke-button]');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-invite-id]').length, 'initial number of invited users').to.equal(0); // click the invite people button

        await (0, _testHelpers.click)('[data-test-button="invite-staff-user"]'); // modal is displayed

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-modal="invite-staff-user"]'), 'correct modal is displayed').to.exist; // number of roles is correct

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-option]').length, 'number of selectable roles').to.equal(4);
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-option="Contributor"]'), 'contributor role is selected initially').to.have.class('active'); // submit valid invite form

        await (0, _testHelpers.fillIn)('.fullscreen-modal input[name="email"]', 'invite1@example.com');
        await (0, _testHelpers.click)('[data-test-button="send-user-invite"]'); // modal closes

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-modal]').length, 'number of modals after sending invite').to.equal(0); // invite is displayed, has correct e-mail + role

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-invite-id]').length, 'number of invites after first invite').to.equal(1);
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-invite-id="2"] [data-test-email]').textContent.trim(), 'displayed email of first invite').to.equal('invite1@example.com');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-invite-id="2"] [data-test-role-name]').textContent.trim(), 'displayed role of first invite').to.equal('Contributor');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-invite-id="2"] [data-test-invite-description]').textContent, 'new invite description').to.match(/expires/); // number of users is unchanged

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-user-id]').length, 'number of active users after first invite').to.equal(2); // submit new invite with different role

        await (0, _testHelpers.click)('.view-actions .gh-btn-primary');
        await (0, _testHelpers.fillIn)('.fullscreen-modal input[name="email"]', 'invite2@example.com');
        await (0, _testHelpers.click)('[data-test-option="Editor"]');
        await (0, _testHelpers.click)('[data-test-button="send-user-invite"]'); // number of invites increases

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-invite-id]').length, 'number of invites after second invite').to.equal(2); // invite has correct e-mail + role

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-invite-id="3"] [data-test-email]').textContent.trim(), 'displayed email of second invite').to.equal('invite2@example.com');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-invite-id="3"] [data-test-role-name]').textContent.trim(), 'displayed role of second invite').to.equal('Editor'); // submit invite form with existing user

        await (0, _testHelpers.click)('.view-actions .gh-btn-primary');
        await (0, _testHelpers.fillIn)('.fullscreen-modal input[name="email"]', 'admin@example.com');
        await (0, _testHelpers.click)('[data-test-button="send-user-invite"]'); // validation message is displayed

        (0, _chai.expect)((0, _testHelpers.find)('.fullscreen-modal .error .response').textContent.trim(), 'inviting existing user error').to.equal('A user with that email address already exists.'); // submit invite form with existing invite

        await (0, _testHelpers.fillIn)('.fullscreen-modal input[name="email"]', 'invite1@example.com');
        await (0, _testHelpers.click)('[data-test-button="send-user-invite"]'); // validation message is displayed

        (0, _chai.expect)((0, _testHelpers.find)('.fullscreen-modal .error .response').textContent.trim(), 'inviting invited user error').to.equal('A user with that email address was already invited.'); // submit invite form with an invalid email

        await (0, _testHelpers.fillIn)('.fullscreen-modal input[name="email"]', 'test');
        await (0, _testHelpers.click)('[data-test-button="send-user-invite"]'); // validation message is displayed

        (0, _chai.expect)((0, _testHelpers.find)('.fullscreen-modal .error .response').textContent.trim(), 'inviting invalid email error').to.equal('Invalid Email.');
        await (0, _testHelpers.click)('.fullscreen-modal a.close'); // revoke latest invite

        await (0, _testHelpers.click)('[data-test-invite-id="3"] [data-test-revoke-button]'); // number of invites decreases

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-invite-id]').length, 'number of invites after revoke').to.equal(1); // notification is displayed

        (0, _chai.expect)((0, _testHelpers.find)('.gh-notification:last-of-type').textContent.trim(), 'notifications contain revoke').to.match(/Invitation revoked\s+invite2@example\.com/); // correct invite is removed

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-invite-id] [data-test-email]').textContent.trim(), 'displayed email of remaining invite').to.equal('invite1@example.com'); // add another invite to test ordering on resend

        await (0, _testHelpers.click)('.view-actions .gh-btn-primary');
        await (0, _testHelpers.fillIn)('.fullscreen-modal input[name="email"]', 'invite3@example.com');
        await (0, _testHelpers.click)('[data-test-button="send-user-invite"]'); // new invite should be last in the list

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-invite-id]:last-of-type [data-test-email]').textContent.trim(), 'last invite email in list').to.equal('invite3@example.com'); // resend first invite

        await (0, _testHelpers.click)('[data-test-invite-id="2"] [data-test-resend-button]'); // notification is displayed

        (0, _chai.expect)((0, _testHelpers.find)('.gh-notification:last-of-type').textContent.trim(), 'notifications contain resend').to.match(/Invitation resent! \(invite1@example\.com\)/); // first invite is still at the top

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-invite-id]:first-of-type [data-test-email]').textContent.trim(), 'first invite email in list').to.equal('invite1@example.com'); // regression test: can revoke a resent invite

        await (0, _testHelpers.click)('[data-test-invite-id]:first-of-type [data-test-resend-button]');
        await (0, _testHelpers.click)('[data-test-invite-id]:first-of-type [data-test-revoke-button]'); // number of invites decreases

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-invite-id]').length, 'number of invites after resend/revoke').to.equal(1); // notification is displayed

        (0, _chai.expect)((0, _testHelpers.find)('.gh-notification:last-of-type').textContent.trim(), 'notifications contain revoke after resend/revoke').to.match(/Invitation revoked\s+invite1@example\.com/);
      });
      (0, _mocha.it)('can manage suspended users', async function () {
        await (0, _visit.visit)('/settings/staff');
        await (0, _testHelpers.click)(`[data-test-user-id="${suspendedUser.id}"]`);
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-suspended-badge]')).to.exist;
        await (0, _testHelpers.click)('[data-test-user-actions]');
        await (0, _testHelpers.click)('[data-test-unsuspend-button]');
        await (0, _testHelpers.click)('[data-test-modal-confirm]'); // NOTE: there seems to be a timing issue with this test - pausing
        // here confirms that the badge is removed but the andThen is firing
        // before the page is updated
        // andThen(() => {
        //     expect('[data-test-suspended-badge]').to.not.exist;
        // });

        await (0, _testHelpers.click)('[data-test-staff-link]'); // suspendedUser is now in active list

        (0, _chai.expect)((0, _testHelpers.find)(`[data-test-active-users] [data-test-user-id="${suspendedUser.id}"]`)).to.exist; // no suspended users

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-suspended-users] [data-test-user-id]').length).to.equal(0);
        await (0, _testHelpers.click)(`[data-test-user-id="${suspendedUser.id}"]`);
        await (0, _testHelpers.click)('[data-test-user-actions]');
        await (0, _testHelpers.click)('[data-test-suspend-button]');
        await (0, _testHelpers.click)('[data-test-modal-confirm]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-suspended-badge]')).to.exist;
      });
      (0, _mocha.it)('can delete users', async function () {
        let user1 = this.server.create('user');
        let user2 = this.server.create('user');
        let post = this.server.create('post', {
          authors: [user2]
        }); // we don't have a full many-to-many relationship in mirage so we
        // need to add the inverse manually

        user2.posts = [post];
        user2.save();
        await (0, _visit.visit)('/settings/staff');
        await (0, _testHelpers.click)(`[data-test-user-id="${user1.id}"]`); // user deletion displays modal

        await (0, _testHelpers.click)('button.delete');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-modal="delete-user"]').length, 'user deletion modal displayed after button click').to.equal(1); // user has no posts so no warning about post deletion

        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-text="user-post-count"]').length, 'deleting user with no posts has no post count').to.equal(0); // cancelling user deletion closes modal

        await (0, _testHelpers.click)('[data-test-button="cancel-delete-user"]');
        (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-modal]').length === 0, 'delete user modal is closed when cancelling').to.be.true; // deleting a user with posts

        await (0, _visit.visit)('/settings/staff');
        await (0, _testHelpers.click)(`[data-test-user-id="${user2.id}"]`);
        await (0, _testHelpers.click)('button.delete'); // user has  posts so should warn about post deletion

        (0, _chai.expect)((0, _testHelpers.find)('[data-test-text="user-post-count"]').textContent, 'deleting user with posts has post count').to.have.string('1 post');
        await (0, _testHelpers.click)('[data-test-button="confirm-delete-user"]'); // redirected to staff page

        (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/settings/staff'); // deleted user is not in list

        (0, _chai.expect)((0, _testHelpers.findAll)(`[data-test-user-id="${user2.id}"]`).length, 'deleted user is not in user list after deletion').to.equal(0);
      });
      (0, _mocha.describe)('existing user', function () {
        let user, newLocation, originalReplaceState;
        (0, _mocha.beforeEach)(function () {
          user = this.server.create('user', {
            slug: 'test-1',
            name: 'Test User',
            facebook: 'test',
            twitter: '@test'
          });
          originalReplaceState = _windowProxy.default.replaceState;

          _windowProxy.default.replaceState = function (params, title, url) {
            newLocation = url;
          };

          newLocation = undefined;
        });
        (0, _mocha.afterEach)(function () {
          _windowProxy.default.replaceState = originalReplaceState;
        });
        (0, _mocha.it)('input fields reset and validate correctly', async function () {
          // test user name
          await (0, _visit.visit)('/settings/staff/test-1');
          (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/staff/test-1');
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-name-input]').value, 'current user name').to.equal('Test User');
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-save-button]').textContent.trim(), 'save button text').to.equal('Save'); // test empty user name

          await (0, _testHelpers.fillIn)('[data-test-name-input]', '');
          await (0, _testHelpers.blur)('[data-test-name-input]');
          (0, _chai.expect)((0, _testHelpers.find)('.user-details-bottom .first-form-group').classList.contains('error'), 'username input is in error state with blank input').to.be.true; // test too long user name

          await (0, _testHelpers.fillIn)('[data-test-name-input]', new Array(195).join('a'));
          await (0, _testHelpers.blur)('[data-test-name-input]');
          (0, _chai.expect)((0, _testHelpers.find)('.user-details-bottom .first-form-group').classList.contains('error'), 'username input is in error state with too long input').to.be.true; // reset name field

          await (0, _testHelpers.fillIn)('[data-test-name-input]', 'Test User');
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-slug-input]').value, 'slug value is default').to.equal('test-1');
          await (0, _testHelpers.fillIn)('[data-test-slug-input]', '');
          await (0, _testHelpers.blur)('[data-test-slug-input]');
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-slug-input]').value, 'slug value is reset to original upon empty string').to.equal('test-1'); // Save changes

          await (0, _testHelpers.click)('[data-test-save-button]'); // Since we reset save status so there's no on-screen indication
          // that we've had a save, check the request was fired instead

          let [lastRequest] = this.server.pretender.handledRequests.slice(-1);
          let params = JSON.parse(lastRequest.requestBody);
          (0, _chai.expect)(params.users[0].name).to.equal('Test User'); // CMD-S shortcut works

          await (0, _testHelpers.fillIn)('[data-test-slug-input]', 'Test User');
          await (0, _testHelpers.triggerEvent)('.gh-app', 'keydown', {
            keyCode: 83,
            // s
            metaKey: _ctrlOrCmd.default === 'command',
            ctrlKey: _ctrlOrCmd.default === 'ctrl'
          }); // Since we reset save status so there's no on-screen indication
          // that we've had a save, check the request was fired instead

          [lastRequest] = this.server.pretender.handledRequests.slice(-1);
          params = JSON.parse(lastRequest.requestBody);
          (0, _chai.expect)(params.users[0].name).to.equal('Test User'); // check that the history state has been updated

          (0, _chai.expect)(newLocation).to.equal('Test User');
          await (0, _testHelpers.fillIn)('[data-test-slug-input]', 'white space');
          await (0, _testHelpers.blur)('[data-test-slug-input]');
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-slug-input]').value, 'slug value is correctly dasherized').to.equal('white-space');
          await (0, _testHelpers.fillIn)('[data-test-email-input]', 'thisisnotanemail');
          await (0, _testHelpers.blur)('[data-test-email-input]');
          (0, _chai.expect)((0, _testHelpers.find)('.user-details-bottom .form-group:nth-of-type(3)').classList.contains('error'), 'email input should be in error state with invalid email').to.be.true;
          await (0, _testHelpers.fillIn)('[data-test-email-input]', 'test@example.com');
          await (0, _testHelpers.fillIn)('[data-test-location-input]', new Array(160).join('a'));
          await (0, _testHelpers.blur)('[data-test-location-input]');
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-location-input]').closest('.form-group'), 'location input should be in error state').to.have.class('error');
          await (0, _testHelpers.fillIn)('[data-test-location-input]', '');
          await (0, _testHelpers.fillIn)('[data-test-website-input]', 'thisisntawebsite');
          await (0, _testHelpers.blur)('[data-test-website-input]');
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-website-input]').closest('.form-group'), 'website input should be in error state').to.have.class('error');

          let testSocialInput = async function (type, input, expectedValue) {
            let expectedError = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : '';
            await (0, _testHelpers.fillIn)(`[data-test-${type}-input]`, input);
            await (0, _testHelpers.blur)(`[data-test-${type}-input]`);
            (0, _chai.expect)((0, _testHelpers.find)(`[data-test-${type}-input]`).value, `${type} value for ${input}`).to.equal(expectedValue);
            (0, _chai.expect)((0, _testHelpers.find)(`[data-test-error="user-${type}"]`).textContent.trim(), `${type} validation response for ${input}`).to.equal(expectedError);
            (0, _chai.expect)((0, _testHelpers.find)(`[data-test-error="user-${type}"]`).closest('.form-group').classList.contains('error'), `${type} input should be in error state with '${input}'`).to.equal(!!expectedError);
          };

          let testFacebookValidation = async function () {
            for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
              args[_key] = arguments[_key];
            }

            return testSocialInput('facebook', ...args);
          };

          let testTwitterValidation = async function () {
            for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
              args[_key2] = arguments[_key2];
            }

            return testSocialInput('twitter', ...args);
          }; // Testing Facebook input
          // displays initial value


          (0, _chai.expect)((0, _testHelpers.find)('[data-test-facebook-input]').value, 'initial facebook value').to.equal('https://www.facebook.com/test');
          await (0, _testHelpers.focus)('[data-test-facebook-input]');
          await (0, _testHelpers.blur)('[data-test-facebook-input]'); // regression test: we still have a value after the input is
          // focused and then blurred without any changes

          (0, _chai.expect)((0, _testHelpers.find)('[data-test-facebook-input]').value, 'facebook value after blur with no change').to.equal('https://www.facebook.com/test');
          await testFacebookValidation('facebook.com/username', 'https://www.facebook.com/username');
          await testFacebookValidation('testuser', 'https://www.facebook.com/testuser');
          await testFacebookValidation('ab99', 'https://www.facebook.com/ab99');
          await testFacebookValidation('page/ab99', 'https://www.facebook.com/page/ab99');
          await testFacebookValidation('page/*(&*(%%))', 'https://www.facebook.com/page/*(&*(%%))');
          await testFacebookValidation('facebook.com/pages/some-facebook-page/857469375913?ref=ts', 'https://www.facebook.com/pages/some-facebook-page/857469375913?ref=ts');
          await testFacebookValidation('https://www.facebook.com/groups/savethecrowninn', 'https://www.facebook.com/groups/savethecrowninn');
          await testFacebookValidation('http://github.com/username', 'http://github.com/username', 'The URL must be in a format like https://www.facebook.com/yourPage');
          await testFacebookValidation('http://github.com/pages/username', 'http://github.com/pages/username', 'The URL must be in a format like https://www.facebook.com/yourPage'); // Testing Twitter input
          // loads fixtures and performs transform

          (0, _chai.expect)((0, _testHelpers.find)('[data-test-twitter-input]').value, 'initial twitter value').to.equal('https://twitter.com/test');
          await (0, _testHelpers.focus)('[data-test-twitter-input]');
          await (0, _testHelpers.blur)('[data-test-twitter-input]'); // regression test: we still have a value after the input is
          // focused and then blurred without any changes

          (0, _chai.expect)((0, _testHelpers.find)('[data-test-twitter-input]').value, 'twitter value after blur with no change').to.equal('https://twitter.com/test');
          await testTwitterValidation('twitter.com/username', 'https://twitter.com/username');
          await testTwitterValidation('testuser', 'https://twitter.com/testuser');
          await testTwitterValidation('http://github.com/username', 'https://twitter.com/username');
          await testTwitterValidation('*(&*(%%))', '*(&*(%%))', 'The URL must be in a format like https://twitter.com/yourUsername');
          await testTwitterValidation('thisusernamehasmorethan15characters', 'thisusernamehasmorethan15characters', 'Your Username is not a valid Twitter Username'); // Testing bio input

          await (0, _testHelpers.fillIn)('[data-test-website-input]', '');
          await (0, _testHelpers.fillIn)('[data-test-bio-input]', new Array(210).join('a'));
          await (0, _testHelpers.blur)('[data-test-bio-input]');
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-bio-input]').closest('.form-group'), 'bio input should be in error state').to.have.class('error'); // password reset ------
          // button triggers validation

          await (0, _testHelpers.click)('[data-test-save-pw-button]');
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-new-pass-input]').closest('.form-group'), 'new password has error class when blank').to.have.class('error');
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="user-new-pass"]').textContent, 'new password error when blank').to.have.string('can\'t be blank'); // validates too short password (< 10 characters)

          await (0, _testHelpers.fillIn)('[data-test-new-pass-input]', 'notlong');
          await (0, _testHelpers.fillIn)('[data-test-ne2-pass-input]', 'notlong'); // enter key triggers action

          await (0, _testHelpers.triggerKeyEvent)('[data-test-new-pass-input]', 'keyup', 13);
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-new-pass-input]').closest('.form-group'), 'new password has error class when password too short').to.have.class('error');
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="user-new-pass"]').textContent, 'new password error when it\'s too short').to.have.string('at least 10 characters long'); // validates unsafe password

          await (0, _testHelpers.fillIn)('#user-password-new', 'ghostisawesome');
          await (0, _testHelpers.fillIn)('[data-test-ne2-pass-input]', 'ghostisawesome'); // enter key triggers action

          await (0, _testHelpers.triggerKeyEvent)('#user-password-new', 'keyup', 13);
          (0, _chai.expect)((0, _testHelpers.find)('#user-password-new').closest('.form-group'), 'new password has error class when password is insecure').to.have.class('error');
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="user-new-pass"]').textContent, 'new password error when it\'s insecure').to.match(/you cannot use an insecure password/); // typing in inputs clears validation

          await (0, _testHelpers.fillIn)('[data-test-new-pass-input]', 'thisissupersafe');
          await (0, _testHelpers.triggerEvent)('[data-test-new-pass-input]', 'input');
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-new-pass-input]').closest('.form-group'), 'password validation is visible after typing').to.not.have.class('error'); // enter key triggers action

          await (0, _testHelpers.triggerKeyEvent)('[data-test-new-pass-input]', 'keyup', 13);
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-ne2-pass-input]').closest('.form-group'), 'confirm password has error class when it doesn\'t match').to.have.class('error');
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="user-ne2-pass"]').textContent, 'confirm password error when it doesn\'t match').to.have.string('do not match'); // submits with correct details

          await (0, _testHelpers.fillIn)('[data-test-ne2-pass-input]', 'thisissupersafe');
          await (0, _testHelpers.click)('[data-test-save-pw-button]'); // hits the endpoint

          let [newRequest] = this.server.pretender.handledRequests.slice(-1);
          params = JSON.parse(newRequest.requestBody);
          (0, _chai.expect)(newRequest.url, 'password request URL').to.match(/\/users\/password/); // eslint-disable-next-line camelcase

          (0, _chai.expect)(params.password[0].user_id).to.equal(user.id.toString());
          (0, _chai.expect)(params.password[0].newPassword).to.equal('thisissupersafe');
          (0, _chai.expect)(params.password[0].ne2Password).to.equal('thisissupersafe'); // clears the fields

          (0, _chai.expect)((0, _testHelpers.find)('[data-test-new-pass-input]').value, 'password field after submit').to.be.empty;
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-ne2-pass-input]').value, 'password verification field after submit').to.be.empty; // displays a notification

          (0, _chai.expect)((0, _testHelpers.findAll)('.gh-notifications .gh-notification').length, 'password saved notification is displayed').to.equal(1);
        });
        (0, _mocha.it)('warns when leaving without saving', async function () {
          await (0, _visit.visit)('/settings/staff/test-1');
          (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/staff/test-1');
          await (0, _testHelpers.fillIn)('[data-test-slug-input]', 'another slug');
          await (0, _testHelpers.blur)('[data-test-slug-input]');
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-slug-input]').value).to.be.equal('another-slug');
          await (0, _testHelpers.fillIn)('[data-test-facebook-input]', 'testuser');
          await (0, _testHelpers.blur)('[data-test-facebook-input]');
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-facebook-input]').value).to.be.equal('https://www.facebook.com/testuser');
          await (0, _visit.visit)('/settings/staff');
          (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-modal]').length, 'modal exists').to.equal(1); // Leave without saving

          await (0, _testHelpers.click)('.fullscreen-modal [data-test-leave-button]');
          (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/staff');
          await (0, _visit.visit)('/settings/staff/test-1');
          (0, _chai.expect)((0, _testHelpers.currentURL)(), 'currentURL').to.equal('/settings/staff/test-1'); // settings were not saved

          (0, _chai.expect)((0, _testHelpers.find)('[data-test-slug-input]').value).to.be.equal('test-1');
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-facebook-input]').value).to.be.equal('https://www.facebook.com/test');
        });
      });
      (0, _mocha.describe)('own user', function () {
        (0, _mocha.it)('requires current password when changing password', async function () {
          await (0, _visit.visit)(`/settings/staff/${admin.slug}`); // test the "old password" field is validated

          await (0, _testHelpers.click)('[data-test-save-pw-button]'); // old password has error

          (0, _chai.expect)((0, _testHelpers.find)('[data-test-old-pass-input]').closest('.form-group'), 'old password has error class when blank').to.have.class('error');
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="user-old-pass"]').textContent, 'old password error when blank').to.have.string('is required'); // new password has error

          (0, _chai.expect)((0, _testHelpers.find)('[data-test-new-pass-input]').closest('.form-group'), 'new password has error class when blank').to.have.class('error');
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-error="user-new-pass"]').textContent, 'new password error when blank').to.have.string('can\'t be blank'); // validation is cleared when typing

          await (0, _testHelpers.fillIn)('[data-test-old-pass-input]', 'password');
          await (0, _testHelpers.triggerEvent)('[data-test-old-pass-input]', 'input');
          (0, _chai.expect)((0, _testHelpers.find)('[data-test-old-pass-input]').closest('.form-group'), 'old password validation is in error state after typing').to.not.have.class('error');
        });
      });
      (0, _mocha.it)('redirects to 404 when user does not exist', async function () {
        this.server.get('/users/slug/unknown/', function () {
          return new _miragejs.Response(404, {
            'Content-Type': 'application/json'
          }, {
            errors: [{
              message: 'User not found.',
              type: 'NotFoundError'
            }]
          });
        });
        await (0, _visit.visit)('/settings/staff/unknown');
        (0, _chai.expect)((0, _testHelpers.currentRouteName)()).to.equal('error404');
        (0, _chai.expect)((0, _testHelpers.currentURL)()).to.equal('/settings/staff/unknown');
      });
    });
    (0, _mocha.describe)('when logged in as author', function () {
      let adminRole, authorRole;
      (0, _mocha.beforeEach)(async function () {
        adminRole = this.server.create('role', {
          name: 'Administrator'
        });
        authorRole = this.server.create('role', {
          name: 'Author'
        });
        this.server.create('user', {
          roles: [authorRole]
        });
        this.server.get('/invites/', function () {
          return new _miragejs.Response(403, {}, {
            errors: [{
              type: 'NoPermissionError',
              message: 'You do not have permission to perform this action'
            }]
          });
        });
        return await (0, _testSupport.authenticateSession)();
      });
      (0, _mocha.it)('is redirected to user profile page', async function () {
        this.server.create('user', {
          roles: [adminRole]
        });
        this.server.create('invite', {
          role: authorRole
        });
        await (0, _visit.visit)('/settings/staff');
        (0, _chai.expect)((0, _testHelpers.currentRouteName)()).to.equal('settings.staff.user');
        (0, _chai.expect)((0, _testHelpers.findAll)('.gh-alert').length).to.equal(0);
      });
    });
  });
});
define("ghost-admin/tests/helpers/data-transfer", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  var c = Ember.Object.extend({
    getData: function () {
      return this.get('payload');
    },
    setData: function (dataType, payload) {
      this.set("data", {
        dataType: dataType,
        payload: payload
      });
    }
  });
  c.reopenClass({
    makeMockEvent: function (payload) {
      var transfer = this.create({
        payload: payload
      });
      var res = {
        dataTransfer: transfer
      };
      res.originalEvent = res;

      res.originalEvent.preventDefault = function () {
        console.log('prevent default');
      };

      res.originalEvent.stopPropagation = function () {
        console.log('stop propagation');
      };

      return res;
    },
    createDomEvent: function (type) {
      var event = document.createEvent("CustomEvent");
      event.initCustomEvent(type, true, true, null);
      event.dataTransfer = {
        data: {},
        setData: function (type, val) {
          this.data[type] = val;
        },
        getData: function (type) {
          return this.data[type];
        }
      };
      return event;
    }
  });
  var _default = c;
  _exports.default = _default;
});
define("ghost-admin/tests/helpers/drag-drop", ["exports", "ember-native-dom-helpers", "ghost-admin/tests/helpers/mock-event"], function (_exports, _emberNativeDomHelpers, _mockEvent) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.drag = drag;

  async function dragOver(dropSelector, moves) {
    moves = moves || [[{
      clientX: 1,
      clientY: 1
    }, dropSelector]];
    return moves.forEach(async _ref => {
      let [position, selector] = _ref;
      let event = new _mockEvent.default(position);
      await (0, _emberNativeDomHelpers.triggerEvent)(selector || dropSelector, 'dragover', event);
    });
  }

  async function drop(dragSelector, dragEvent, options) {
    let {
      drop: dropSelector,
      dropEndOptions,
      dragOverMoves
    } = options;
    let dropElement = await (0, _emberNativeDomHelpers.find)(dropSelector);

    if (!dropElement) {
      throw `There are no drop targets by the given selector: '${dropSelector}'`;
    }

    await dragOver(dropSelector, dragOverMoves);

    if (options.beforeDrop) {
      await options.beforeDrop.call();
    }

    let event = new _mockEvent.default().useDataTransferData(dragEvent);
    await (0, _emberNativeDomHelpers.triggerEvent)(dropSelector, 'drop', event);
    return await (0, _emberNativeDomHelpers.triggerEvent)(dragSelector, 'dragend', dropEndOptions);
  }

  async function drag(dragSelector) {
    let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    let dragEvent = new _mockEvent.default(options.dragStartOptions);
    await (0, _emberNativeDomHelpers.triggerEvent)(dragSelector, 'mouseover');
    await (0, _emberNativeDomHelpers.triggerEvent)(dragSelector, 'dragstart', dragEvent);

    if (options.afterDrag) {
      await options.afterDrag.call();
    }

    if (options.drop) {
      await drop(dragSelector, dragEvent, options);
    }
  }
});
define("ghost-admin/tests/helpers/ember-drag-drop", ["exports", "jquery", "ghost-admin/tests/helpers/data-transfer"], function (_exports, _jquery, _dataTransfer) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.drag = drag;

  function drop($dragHandle, dropCssPath, dragEvent) {
    let $dropTarget = (0, _jquery.default)(dropCssPath);

    if ($dropTarget.length === 0) {
      throw `There are no drop targets by the given selector: '${dropCssPath}'`;
    }

    Ember.run(() => {
      triggerEvent($dropTarget, 'dragover', _dataTransfer.default.makeMockEvent());
    });
    Ember.run(() => {
      triggerEvent($dropTarget, 'drop', _dataTransfer.default.makeMockEvent(dragEvent.dataTransfer.get('data.payload')));
    });
    Ember.run(() => {
      triggerEvent($dragHandle, 'dragend', _dataTransfer.default.makeMockEvent());
    });
  }

  function drag(cssPath) {
    let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    let dragEvent = _dataTransfer.default.makeMockEvent();

    let $dragHandle = (0, _jquery.default)(cssPath);
    Ember.run(() => {
      triggerEvent($dragHandle, 'mouseover');
    });
    Ember.run(() => {
      triggerEvent($dragHandle, 'dragstart', dragEvent);
    });
    andThen(function () {
      if (options.beforeDrop) {
        options.beforeDrop.call();
      }
    });
    andThen(function () {
      if (options.drop) {
        drop($dragHandle, options.drop, dragEvent);
      }
    });
  }
});
define("ghost-admin/tests/helpers/ember-power-calendar", ["exports", "ember-power-calendar/test-support"], function (_exports, _testSupport) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = _default;

  function _default() {
    Ember.Test.registerAsyncHelper('calendarCenter', async function (app, selector, newCenter) {
      return (0, _testSupport.calendarCenter)(selector, newCenter);
    });
    Ember.Test.registerAsyncHelper('calendarSelect', async function (app, selector, selected) {
      return (0, _testSupport.calendarSelect)(selector, selected);
    });
  }
});
define("ghost-admin/tests/helpers/ember-power-select", ["exports", "ember-power-select/test-support/helpers"], function (_exports, _helpers) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.clickTrigger = void 0;
  _exports.default = deprecatedRegisterHelpers;
  _exports.typeInSearch = _exports.triggerKeydown = _exports.touchTrigger = _exports.selectChoose = _exports.nativeTouch = _exports.nativeMouseUp = _exports.nativeMouseDown = _exports.findContains = void 0;

  function deprecateHelper(fn, name) {
    return function () {
      (true && !(false) && Ember.deprecate(`DEPRECATED \`import { ${name} } from '../../tests/helpers/ember-power-select';\` is deprecated. Please, replace it with \`import { ${name} } from 'ember-power-select/test-support/helpers';\``, false, {
        until: '1.11.0',
        id: `ember-power-select-test-support-${name}`
      }));
      return fn(...arguments);
    };
  }

  let findContains = deprecateHelper(_helpers.findContains, 'findContains');
  _exports.findContains = findContains;
  let nativeMouseDown = deprecateHelper(_helpers.nativeMouseDown, 'nativeMouseDown');
  _exports.nativeMouseDown = nativeMouseDown;
  let nativeMouseUp = deprecateHelper(_helpers.nativeMouseUp, 'nativeMouseUp');
  _exports.nativeMouseUp = nativeMouseUp;
  let triggerKeydown = deprecateHelper(_helpers.triggerKeydown, 'triggerKeydown');
  _exports.triggerKeydown = triggerKeydown;
  let typeInSearch = deprecateHelper(_helpers.typeInSearch, 'typeInSearch');
  _exports.typeInSearch = typeInSearch;
  let clickTrigger = deprecateHelper(_helpers.clickTrigger, 'clickTrigger');
  _exports.clickTrigger = clickTrigger;
  let nativeTouch = deprecateHelper(_helpers.nativeTouch, 'nativeTouch');
  _exports.nativeTouch = nativeTouch;
  let touchTrigger = deprecateHelper(_helpers.touchTrigger, 'touchTrigger');
  _exports.touchTrigger = touchTrigger;
  let selectChoose = deprecateHelper(_helpers.selectChoose, 'selectChoose');
  _exports.selectChoose = selectChoose;

  function deprecatedRegisterHelpers() {
    (true && !(false) && Ember.deprecate("DEPRECATED `import registerPowerSelectHelpers from '../../tests/helpers/ember-power-select';` is deprecated. Please, replace it with `import registerPowerSelectHelpers from 'ember-power-select/test-support/helpers';`", false, {
      until: '1.11.0',
      id: 'ember-power-select-test-support-register-helpers'
    }));
    return (0, _helpers.default)();
  }
});
define("ghost-admin/tests/helpers/file-upload", ["exports", "@ember/test-helpers"], function (_exports, _testHelpers) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.createFile = createFile;
  _exports.fileUpload = fileUpload;

  function createFile() {
    let content = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : ['test'];
    let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    let {
      name,
      type
    } = options;
    let file = new Blob(content, {
      type: type ? type : 'text/plain'
    });
    file.name = name ? name : 'test.txt';
    return file;
  }

  function fileUpload(target, content, options) {
    let file = createFile(content, options);
    return (0, _testHelpers.triggerEvent)(target, 'change', {
      files: [file]
    });
  }
});
define("ghost-admin/tests/helpers/labs-flag", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.disableLabsFlag = disableLabsFlag;
  _exports.enableLabsFlag = enableLabsFlag;

  function enableLabsFlag(server, flag) {
    if (!server.schema.configs.all().length) {
      server.loadFixtures('configs');
    }

    if (!server.schema.settings.all().length) {
      server.loadFixtures('settings');
    }

    const config = server.schema.configs.first();
    config.update({
      enableDeveloperExperiments: true
    });
    const existingSetting = server.db.settings.findBy({
      key: 'labs'
    }).value;
    const labsSetting = existingSetting ? JSON.parse(existingSetting) : {};
    labsSetting[flag] = true;
    server.db.settings.update({
      key: 'labs'
    }, {
      value: JSON.stringify(labsSetting)
    });
  }

  function disableLabsFlag(server, flag) {
    if (!server.schema.configs.all().length) {
      server.loadFixtures('configs');
    }

    if (!server.schema.settings.all().length) {
      server.loadFixtures('settings');
    }

    const config = server.schema.configs.first();
    config.update({
      enableDeveloperExperiments: true
    });
    const labsSetting = {};
    labsSetting[flag] = false;
    server.db.settings.update({
      key: 'labs'
    }, {
      value: JSON.stringify(labsSetting)
    });
  }
});
define("ghost-admin/tests/helpers/login-as-role", ["exports", "ember-simple-auth/test-support"], function (_exports, _testSupport) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = loginRole;

  async function loginRole(roleName, server) {
    const role = server.create('role', {
      name: roleName
    });
    const user = server.create('user', {
      roles: [role],
      slug: 'test-user'
    });
    await (0, _testSupport.invalidateSession)();
    await (0, _testSupport.authenticateSession)();
    return user;
  }
});
define("ghost-admin/tests/helpers/mailgun", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.disableMailgun = disableMailgun;
  _exports.enableMailgun = enableMailgun;

  function enableMailgun(server) {
    let enabled = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
    server.db.settings.find({
      key: 'mailgun_api_key'
    }) ? server.db.settings.update({
      key: 'mailgun_api_key'
    }, {
      value: enabled ? 'MAILGUN_API_KEY' : null
    }) : server.create('setting', {
      key: 'mailgun_api_key',
      value: enabled ? 'MAILGUN_API_KEY' : null,
      group: 'email'
    });
    server.db.settings.find({
      key: 'mailgun_domain'
    }) ? server.db.settings.update({
      key: 'mailgun_domain'
    }, {
      value: enabled ? 'MAILGUN_DOMAIN' : null
    }) : server.create('setting', {
      key: 'mailgun_domain',
      value: enabled ? 'MAILGUN_DOMAIN' : null,
      group: 'email'
    });
    server.db.settings.find({
      key: 'mailgun_base_url'
    }) ? server.db.settings.update({
      key: 'mailgun_base_url'
    }, {
      value: enabled ? 'MAILGUN_BASE_URL' : null
    }) : server.create('setting', {
      key: 'mailgun_base_url',
      value: enabled ? 'MAILGUN_BASE_URL' : null,
      group: 'email'
    });
  }

  function disableMailgun(server) {
    enableMailgun(server, false);
  }
});
define("ghost-admin/tests/helpers/members", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.disableMembers = disableMembers;
  _exports.enableMembers = enableMembers;

  function enableMembers(server) {
    server.db.settings.find({
      key: 'members_signup_access'
    }) ? server.db.settings.update({
      key: 'members_signup_access'
    }, {
      value: 'all'
    }) : server.create('setting', {
      key: 'members_signup_access',
      value: 'all',
      group: 'members'
    });
  }

  function disableMembers(server) {
    server.db.settings.find({
      key: 'members_signup_access'
    }) ? server.db.settings.update({
      key: 'members_signup_access'
    }, {
      value: 'none'
    }) : server.create('setting', {
      key: 'members_signup_access',
      value: 'none',
      group: 'members'
    });
  }
});
define("ghost-admin/tests/helpers/mock-event", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.createDomEvent = createDomEvent;
  _exports.default = void 0;

  class DataTransfer {
    constructor() {
      this.data = {};
    }

    setData(type, value) {
      this.data[type] = value;
      return this;
    }

    getData() {
      let type = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "Text";
      return this.data[type];
    }

    setDragImage() {}

  }

  window.__CLASSIC_HAS_CONSTRUCTOR__.set(DataTransfer, true);

  window.__CLASSIC_OWN_CLASSES__.set(DataTransfer, true);

  class MockEvent {
    constructor() {
      let options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      this.dataTransfer = new DataTransfer();
      this.dataTransfer.setData('Text', options.dataTransferData);
      this.originalEvent = this;
      this.setProperties(options);
    }

    useDataTransferData(otherEvent) {
      this.dataTransfer.setData('Text', otherEvent.dataTransfer.getData());
      return this;
    }

    setProperties(props) {
      for (let prop in props) {
        this[prop] = props[prop];
      }

      return this;
    }

    preventDefault() {}

    stopPropagation() {}

  }

  _exports.default = MockEvent;

  window.__CLASSIC_HAS_CONSTRUCTOR__.set(MockEvent, true);

  window.__CLASSIC_OWN_CLASSES__.set(MockEvent, true);

  function createDomEvent(type) {
    let event = document.createEvent("CustomEvent");
    event.initCustomEvent(type, true, true, null);
    event.dataTransfer = new DataTransfer();
    return event;
  }
});
define("ghost-admin/tests/helpers/newsletters", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.disableNewsletters = disableNewsletters;
  _exports.enableNewsletters = enableNewsletters;

  function enableNewsletters(server) {
    let enabled = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
    server.db.settings.find({
      key: 'editor_default_email_recipients'
    }) ? server.db.settings.update({
      key: 'editor_default_email_recipients'
    }, {
      value: enabled ? 'visibility' : 'disabled'
    }) : server.create('setting', {
      key: 'editor_default_email_recipients',
      value: enabled ? 'visibility' : 'disabled',
      group: 'editor'
    });
  }

  function disableNewsletters(server) {
    enableNewsletters(server, false);
  }
});
define("ghost-admin/tests/helpers/stripe", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.disableStripe = disableStripe;
  _exports.enableStripe = enableStripe;

  function enableStripe(server) {
    let enabled = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
    server.db.settings.find({
      key: 'stripe_connect_account_id'
    }) ? server.db.settings.update({
      key: 'stripe_connect_account_id'
    }, {
      value: enabled ? 'stripe_account_id' : null
    }) : server.create('setting', {
      key: 'stripe_connect_account_id',
      value: enabled ? 'stripe_account_id' : null,
      group: 'members'
    }); // needed for membersUtils.isStripeEnabled

    server.db.settings.find({
      key: 'stripe_connect_secret_key'
    }) ? server.db.settings.update({
      key: 'stripe_connect_secret_key'
    }, {
      value: enabled ? 'stripe_secret_key' : null
    }) : server.create('setting', {
      key: 'stripe_connect_secret_key',
      value: enabled ? 'stripe_secret_key' : null,
      group: 'members'
    });
    server.db.settings.find({
      key: 'stripe_connect_publishable_key'
    }) ? server.db.settings.update({
      key: 'stripe_connect_publishable_key'
    }, {
      value: enabled ? 'stripe_secret_key' : null
    }) : server.create('setting', {
      key: 'stripe_connect_publishable_key',
      value: enabled ? 'stripe_secret_key' : null,
      group: 'members'
    });
    server.db.settings.find({
      key: 'paid_members_enabled'
    }) ? server.db.settings.update({
      key: 'paid_members_enabled'
    }, {
      value: enabled
    }) : server.create('setting', {
      key: 'paid_members_enabled',
      value: enabled,
      group: 'members'
    });
  }

  function disableStripe(server) {
    enableStripe(server, false);
  }
});
define("ghost-admin/tests/helpers/visit", ["exports", "@ember/test-helpers"], function (_exports, _testHelpers) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.visit = visit;

  // TODO: remove once bug is fixed in Ember
  // see https://github.com/emberjs/ember-test-helpers/issues/332
  async function visit(url) {
    try {
      await (0, _testHelpers.visit)(url);
    } catch (e) {
      if (e.message !== 'TransitionAborted') {
        throw e;
      }
    }

    await (0, _testHelpers.settled)();
  }
});
define("ghost-admin/tests/integration/adapters/tag-test", ["pretender", "ghost-admin/utils/ghost-paths", "mocha", "chai", "ember-mocha"], function (_pretender, _ghostPaths, _mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Integration: Adapter: tag', function () {
    (0, _emberMocha.setupTest)();
    let server, store;
    beforeEach(function () {
      store = this.owner.lookup('service:store');
      server = new _pretender.default();
    });
    afterEach(function () {
      server.shutdown();
    });
    (0, _mocha.it)('loads tags from regular endpoint when all are fetched', function (done) {
      server.get(`${(0, _ghostPaths.default)().apiRoot}/tags/`, function () {
        return [200, {
          'Content-Type': 'application/json'
        }, JSON.stringify({
          tags: [{
            id: 1,
            name: 'Tag 1',
            slug: 'tag-1'
          }, {
            id: 2,
            name: 'Tag 2',
            slug: 'tag-2'
          }]
        })];
      });
      store.findAll('tag', {
        reload: true
      }).then(tags => {
        (0, _chai.expect)(tags).to.be.ok;
        (0, _chai.expect)(tags.objectAtContent(0).get('name')).to.equal('Tag 1');
        done();
      });
    });
    (0, _mocha.it)('loads tag from slug endpoint when single tag is queried and slug is passed in', function (done) {
      server.get(`${(0, _ghostPaths.default)().apiRoot}/tags/slug/tag-1/`, function () {
        return [200, {
          'Content-Type': 'application/json'
        }, JSON.stringify({
          tags: [{
            id: 1,
            slug: 'tag-1',
            name: 'Tag 1'
          }]
        })];
      });
      store.queryRecord('tag', {
        slug: 'tag-1'
      }).then(tag => {
        (0, _chai.expect)(tag).to.be.ok;
        (0, _chai.expect)(tag.get('name')).to.equal('Tag 1');
        done();
      });
    });
  });
});
define("ghost-admin/tests/integration/adapters/user-test", ["pretender", "ghost-admin/utils/ghost-paths", "mocha", "chai", "ember-mocha"], function (_pretender, _ghostPaths, _mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Integration: Adapter: user', function () {
    (0, _emberMocha.setupTest)();
    let server, store;
    beforeEach(function () {
      store = this.owner.lookup('service:store');
      server = new _pretender.default();
    });
    afterEach(function () {
      server.shutdown();
    });
    (0, _mocha.it)('loads users from regular endpoint when all are fetched', function (done) {
      server.get(`${(0, _ghostPaths.default)().apiRoot}/users/`, function () {
        return [200, {
          'Content-Type': 'application/json'
        }, JSON.stringify({
          users: [{
            id: 1,
            name: 'User 1',
            slug: 'user-1'
          }, {
            id: 2,
            name: 'User 2',
            slug: 'user-2'
          }]
        })];
      });
      store.findAll('user', {
        reload: true
      }).then(users => {
        (0, _chai.expect)(users).to.be.ok;
        (0, _chai.expect)(users.objectAtContent(0).get('name')).to.equal('User 1');
        done();
      });
    });
    (0, _mocha.it)('loads user from slug endpoint when single user is queried and slug is passed in', function (done) {
      server.get(`${(0, _ghostPaths.default)().apiRoot}/users/slug/user-1/`, function () {
        return [200, {
          'Content-Type': 'application/json'
        }, JSON.stringify({
          users: [{
            id: 1,
            slug: 'user-1',
            name: 'User 1'
          }]
        })];
      });
      store.queryRecord('user', {
        slug: 'user-1'
      }).then(user => {
        (0, _chai.expect)(user).to.be.ok;
        (0, _chai.expect)(user.get('name')).to.equal('User 1');
        done();
      });
    });
    (0, _mocha.it)('handles "include" parameter when querying single user via slug', function (done) {
      server.get(`${(0, _ghostPaths.default)().apiRoot}/users/slug/user-1/`, request => {
        let params = request.queryParams;
        (0, _chai.expect)(params.include, 'include query').to.equal('roles,count.posts');
        return [200, {
          'Content-Type': 'application/json'
        }, JSON.stringify({
          users: [{
            id: 1,
            slug: 'user-1',
            name: 'User 1',
            count: {
              posts: 5
            }
          }]
        })];
      });
      store.queryRecord('user', {
        slug: 'user-1',
        include: 'count.posts'
      }).then(user => {
        (0, _chai.expect)(user).to.be.ok;
        (0, _chai.expect)(user.get('name')).to.equal('User 1');
        (0, _chai.expect)(user.get('count.posts')).to.equal(5);
        done();
      });
    });
  });
});
define("ghost-admin/tests/integration/components/gh-alert-test", ["sinon", "@ember/test-helpers", "mocha", "chai", "ember-mocha"], function (_sinon, _testHelpers, _mocha, _chai, _emberMocha) {
  "use strict";

  var _dec, _dec2, _class, _descriptor, _descriptor2;

  function _initializerDefineProperty(target, property, descriptor, context) { if (!descriptor) return; Object.defineProperty(target, property, { enumerable: descriptor.enumerable, configurable: descriptor.configurable, writable: descriptor.writable, value: descriptor.initializer ? descriptor.initializer.call(context) : void 0 }); }

  function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  function _initializerWarningHelper(descriptor, context) { throw new Error('Decorating class property failed. Please ensure that ' + 'proposal-class-properties is enabled and runs after the decorators transform.'); }

  let Message = (_dec = Ember._tracked, _dec2 = Ember._tracked, (_class = class Message {
    constructor(_ref) {
      let {
        message,
        type
      } = _ref;

      _initializerDefineProperty(this, "message", _descriptor, this);

      _initializerDefineProperty(this, "type", _descriptor2, this);

      this.message = message;
      this.type = type;
    }

  }, (_descriptor = _applyDecoratedDescriptor(_class.prototype, "message", [_dec], {
    configurable: true,
    enumerable: true,
    writable: true,
    initializer: null
  }), _descriptor2 = _applyDecoratedDescriptor(_class.prototype, "type", [_dec2], {
    configurable: true,
    enumerable: true,
    writable: true,
    initializer: null
  })), _class));

  window.__CLASSIC_HAS_CONSTRUCTOR__.set(Message, true);

  window.__CLASSIC_OWN_CLASSES__.set(Message, true);

  (0, _mocha.describe)('Integration: Component: gh-alert', function () {
    (0, _emberMocha.setupRenderingTest)();
    (0, _mocha.it)('renders', async function () {
      this.set('message', new Message({
        message: 'Test message',
        type: 'success'
      }));
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhAlert @message={{this.message}} />
      */
      {
        "id": "LYhfr+GA",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-alert\",[],[[\"@message\"],[[32,0,[\"message\"]]]],null]],\"hasEval\":false,\"upvars\":[]}",
        "moduleName": "(unknown template module)"
      }));
      let alert = this.element.querySelector('article.gh-alert');
      (0, _chai.expect)(alert).to.exist;
      (0, _chai.expect)(alert).to.contain.text('Test message');
    });
    (0, _mocha.it)('maps message types to CSS classes', async function () {
      this.set('message', new Message({
        message: 'Test message',
        type: 'success'
      }));
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhAlert @message={{this.message}} />
      */
      {
        "id": "LYhfr+GA",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-alert\",[],[[\"@message\"],[[32,0,[\"message\"]]]],null]],\"hasEval\":false,\"upvars\":[]}",
        "moduleName": "(unknown template module)"
      }));
      let alert = this.element.querySelector('article.gh-alert');
      this.message.type = 'success';
      await (0, _testHelpers.settled)();
      (0, _chai.expect)(alert, 'success class is green').to.have.class('gh-alert-green');
      this.message.type = 'error';
      await (0, _testHelpers.settled)();
      (0, _chai.expect)(alert, 'error class is red').to.have.class('gh-alert-red');
      this.message.type = 'warn';
      await (0, _testHelpers.settled)();
      (0, _chai.expect)(alert, 'warn class is yellow').to.have.class('gh-alert-blue');
      this.message.type = 'info';
      await (0, _testHelpers.settled)();
      (0, _chai.expect)(alert, 'info class is blue').to.have.class('gh-alert-blue');
    });
    (0, _mocha.it)('closes notification through notifications service', async function () {
      let message = new Message({
        message: 'Test close',
        type: 'success'
      });
      this.set('message', message);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhAlert @message={{this.message}} />
      */
      {
        "id": "LYhfr+GA",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-alert\",[],[[\"@message\"],[[32,0,[\"message\"]]]],null]],\"hasEval\":false,\"upvars\":[]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.find)('article.gh-alert')).to.exist;
      let notifications = this.owner.lookup('service:notifications');
      notifications.closeNotification = _sinon.default.stub();
      await (0, _testHelpers.click)('[data-test-button="close-notification"]');
      (0, _chai.expect)(notifications.closeNotification.calledWith(message)).to.be.true;
    });
  });
});
define("ghost-admin/tests/integration/components/gh-alerts-test", ["mocha", "chai", "@ember/test-helpers", "ember-mocha"], function (_mocha, _chai, _testHelpers, _emberMocha) {
  "use strict";

  let notificationsStub = Ember.Service.extend({
    alerts: Ember.A()
  });
  (0, _mocha.describe)('Integration: Component: gh-alerts', function () {
    (0, _emberMocha.setupRenderingTest)();
    beforeEach(function () {
      this.owner.register('service:notifications', notificationsStub);
      let notifications = this.owner.lookup('service:notifications');
      notifications.set('alerts', [{
        message: 'First',
        type: 'error'
      }, {
        message: 'Second',
        type: 'warn'
      }]);
    });
    (0, _mocha.it)('renders', async function () {
      let notifications = this.owner.lookup('service:notifications');
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-alerts}}
      */
      {
        "id": "FRh6LxKe",
        "block": "{\"symbols\":[],\"statements\":[[1,[34,0]]],\"hasEval\":false,\"upvars\":[\"gh-alerts\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.findAll)('.gh-alerts').length).to.equal(1);
      (0, _chai.expect)((0, _testHelpers.find)('.gh-alerts').children.length).to.equal(2);
      notifications.set('alerts', Ember.A());
      await (0, _testHelpers.settled)();
      (0, _chai.expect)((0, _testHelpers.find)('.gh-alerts').children.length).to.equal(0);
    });
    (0, _mocha.it)('triggers "notify" action when message count changes', async function () {
      let notifications = this.owner.lookup('service:notifications');
      let expectedCount = 0; // test double for notify action

      this.set('notify', count => (0, _chai.expect)(count).to.equal(expectedCount));
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-alerts notify=(action notify)}}
      */
      {
        "id": "7/NtfZLm",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,2],null,[[\"notify\"],[[30,[36,1],[[32,0],[35,0]],null]]]]]],\"hasEval\":false,\"upvars\":[\"notify\",\"action\",\"gh-alerts\"]}",
        "moduleName": "(unknown template module)"
      }));
      expectedCount = 3;
      notifications.alerts.pushObject({
        message: 'Third',
        type: 'success'
      });
      await (0, _testHelpers.settled)();
      expectedCount = 0;
      notifications.set('alerts', Ember.A());
      await (0, _testHelpers.settled)();
    });
  });
});
define("ghost-admin/tests/integration/components/gh-basic-dropdown-test", ["ember-basic-dropdown/test-support/helpers", "mocha", "chai", "@ember/test-helpers", "ember-mocha"], function (_helpers, _mocha, _chai, _testHelpers, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Integration: Component: gh-basic-dropdown', function () {
    (0, _emberMocha.setupRenderingTest)();
    (0, _mocha.it)('closes when dropdown service fires close event', async function () {
      let dropdownService = this.owner.lookup('service:dropdown');
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        
                  <GhBasicDropdown as |dropdown|>
                      <dropdown.Trigger>Click me!</dropdown.Trigger>
                      <dropdown.Content><div id="dropdown-is-opened">Content of the trigger</div></dropdown.Content>
                  </GhBasicDropdown>
              
      */
      {
        "id": "IyyMqPe6",
        "block": "{\"symbols\":[\"dropdown\"],\"statements\":[[2,\"\\n            \"],[8,\"gh-basic-dropdown\",[],[[],[]],[[\"default\"],[{\"statements\":[[2,\"\\n                \"],[8,[32,1,[\"Trigger\"]],[],[[],[]],[[\"default\"],[{\"statements\":[[2,\"Click me!\"]],\"parameters\":[]}]]],[2,\"\\n                \"],[8,[32,1,[\"Content\"]],[],[[],[]],[[\"default\"],[{\"statements\":[[10,\"div\"],[14,1,\"dropdown-is-opened\"],[12],[2,\"Content of the trigger\"],[13]],\"parameters\":[]}]]],[2,\"\\n            \"]],\"parameters\":[1]}]]],[2,\"\\n        \"]],\"hasEval\":false,\"upvars\":[]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _helpers.clickTrigger)();
      (0, _chai.expect)((0, _testHelpers.find)('#dropdown-is-opened')).to.exist;
      dropdownService.closeDropdowns();
      await (0, _testHelpers.settled)();
      (0, _chai.expect)((0, _testHelpers.find)('#dropdown-is-opened')).to.not.exist;
    });
  });
});
define("ghost-admin/tests/integration/components/gh-cm-editor-test", ["mocha", "chai", "@ember/test-helpers", "ember-mocha"], function (_mocha, _chai, _testHelpers, _emberMocha) {
  "use strict";

  // NOTE: If the browser window is not focused/visible CodeMirror (or Chrome?) will
  // take longer to respond to/fire events so it's possible that some of these tests
  // will take 1-3 seconds
  (0, _mocha.describe)('Integration: Component: gh-cm-editor', function () {
    (0, _emberMocha.setupRenderingTest)();
    (0, _mocha.it)('handles change event', async function () {
      this.set('text', '');
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-cm-editor text class="gh-input" update=(action (mut text))}}
      */
      {
        "id": "6MzBEwe/",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,3],[[35,0]],[[\"class\",\"update\"],[\"gh-input\",[30,[36,2],[[32,0],[30,[36,1],[[35,0]],null]],null]]]]]],\"hasEval\":false,\"upvars\":[\"text\",\"mut\",\"action\",\"gh-cm-editor\"]}",
        "moduleName": "(unknown template module)"
      })); // access CodeMirror directly as it doesn't pick up changes to the textarea

      let cm = (0, _testHelpers.find)('.gh-input .CodeMirror').CodeMirror;
      cm.setValue('Testing');
      await (0, _testHelpers.settled)();
      (0, _chai.expect)(this.text, 'text value after CM editor change').to.equal('Testing');
    });
    (0, _mocha.it)('can autofocus', async function () {
      // CodeMirror's events are triggered outside of anything we can watch for
      // in the tests so let's run the class check when we know the event has
      // been fired and timeout if it's not fired as we expect
      let onFocus = async () => {
        // wait for runloop to finish so that the new class has been rendered
        await (0, _testHelpers.settled)();
        (0, _chai.expect)((0, _testHelpers.find)('.gh-input').classList.contains('focus'), 'has focused class on first render with autofocus').to.be.true;
      };

      this.set('onFocus', onFocus);
      this.set('text', '');
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-cm-editor text class="gh-input" update=(action (mut text)) autofocus=true focus-in=(action onFocus)}}
      */
      {
        "id": "FqyP1It8",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,4],[[35,2]],[[\"class\",\"update\",\"autofocus\",\"focus-in\"],[\"gh-input\",[30,[36,1],[[32,0],[30,[36,3],[[35,2]],null]],null],true,[30,[36,1],[[32,0],[35,0]],null]]]]]],\"hasEval\":false,\"upvars\":[\"onFocus\",\"action\",\"text\",\"mut\",\"gh-cm-editor\"]}",
        "moduleName": "(unknown template module)"
      }));
    });
  });
});
define("ghost-admin/tests/integration/components/gh-date-picker-test", ["moment", "sinon", "@ember/test-helpers", "ember-power-datepicker/test-support", "mocha", "chai", "ember-mocha"], function (_moment, _sinon, _testHelpers, _testSupport, _mocha, _chai, _emberMocha) {
  "use strict";

  // import Service from '@ember/service';
  // class SettingsStub extends Service {
  //     timezone = 'Etc/UTC';
  //     get(key) {
  //         if (key === 'timezone') {
  //             return this.timezone;
  //         }
  //     }
  // }
  (0, _mocha.describe)('Integration: Component: gh-date-picker', function () {
    (0, _emberMocha.setupRenderingTest)();
    let clock; // beforeEach(async function () {
    //     this.owner.register('service:settings', SettingsStub);
    // });

    afterEach(function () {
      clock?.restore();
    });
    (0, _mocha.it)('renders', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhDatePicker />
      */
      {
        "id": "qO+BMVwv",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-date-picker\",[],[[],[]],null]],\"hasEval\":false,\"upvars\":[]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-picker-trigger]'), 'datepicker trigger').to.exist;
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-picker-input]'), 'datepicker input').to.exist;
    });
    (0, _mocha.it)('defaults to now when @value is empty', async function () {
      clock = _sinon.default.useFakeTimers({
        now: (0, _moment.default)('2022-02-22 22:22:22.000Z').toDate()
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhDatePicker />
      */
      {
        "id": "qO+BMVwv",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-date-picker\",[],[[],[]],null]],\"hasEval\":false,\"upvars\":[]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-picker-input]'), 'date input').to.have.value('2022-02-22');
    });
    (0, _mocha.it)('shows passed in @value value', async function () {
      this.set('date', (0, _moment.default)('2022-02-22 22:22:22.000Z')).toDate();
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhDatePicker @value={{this.date}} />
      */
      {
        "id": "z1tF/r1P",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-date-picker\",[],[[\"@value\"],[[32,0,[\"date\"]]]],null]],\"hasEval\":false,\"upvars\":[]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-picker-input]'), 'date input').to.have.value('2022-02-22');
    });
    (0, _mocha.it)('updates date via input blur', async function () {
      this.set('date', (0, _moment.default)('2022-02-22 22:22:22.000Z')).toDate();

      const changeSpy = _sinon.default.spy();

      this.set('onChange', changeSpy);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhDatePicker @value={{this.date}} @onChange={{this.onChange}} />
      */
      {
        "id": "p0lk2HYY",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-date-picker\",[],[[\"@value\",\"@onChange\"],[[32,0,[\"date\"]],[32,0,[\"onChange\"]]]],null]],\"hasEval\":false,\"upvars\":[]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _testHelpers.fillIn)('[data-test-date-picker-input]', '2022-02-28');
      await (0, _testHelpers.blur)('[data-test-date-picker-input]');
      (0, _chai.expect)(changeSpy.callCount).to.equal(1);
      (0, _chai.expect)(changeSpy.firstCall.args[0]).to.be.an.instanceof(Date);
      (0, _chai.expect)(changeSpy.firstCall.args[0].toISOString()).to.equal((0, _moment.default)('2022-02-28T00:00:00.000Z').toISOString());
    });
    (0, _mocha.it)('updates date via input Enter keydown', async function () {
      this.set('date', (0, _moment.default)('2022-02-22 22:22:22.000Z')).toDate();

      const changeSpy = _sinon.default.spy();

      this.set('onChange', changeSpy);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhDatePicker @value={{this.date}} @onChange={{this.onChange}} />
      */
      {
        "id": "p0lk2HYY",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-date-picker\",[],[[\"@value\",\"@onChange\"],[[32,0,[\"date\"]],[32,0,[\"onChange\"]]]],null]],\"hasEval\":false,\"upvars\":[]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _testHelpers.fillIn)('[data-test-date-picker-input]', '2022-02-28');
      await (0, _testHelpers.triggerKeyEvent)('[data-test-date-picker-input]', 'keydown', 'Enter');
      (0, _chai.expect)(changeSpy.callCount).to.equal(1);
      (0, _chai.expect)(changeSpy.firstCall.args[0]).to.be.an.instanceof(Date);
      (0, _chai.expect)(changeSpy.firstCall.args[0].toISOString()).to.equal((0, _moment.default)('2022-02-28T00:00:00.000Z').toISOString());
    });
    (0, _mocha.it)('updates date via datepicker selection', async function () {
      this.set('date', (0, _moment.default)('2022-02-22 22:22:22.000Z')).toDate();

      const onChange = newDate => {
        this.set('date', newDate);
      };

      const changeSpy = _sinon.default.spy(onChange);

      this.set('onChange', changeSpy);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhDatePicker @value={{this.date}} @onChange={{this.onChange}} />
      */
      {
        "id": "p0lk2HYY",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-date-picker\",[],[[\"@value\",\"@onChange\"],[[32,0,[\"date\"]],[32,0,[\"onChange\"]]]],null]],\"hasEval\":false,\"upvars\":[]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _testSupport.datepickerSelect)('[data-test-date-picker-trigger]', (0, _moment.default)('2022-02-27T13:00:00.000Z').toDate());
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-picker-input]')).to.have.value('2022-02-27');
      (0, _chai.expect)(changeSpy.callCount).to.equal(1);
      (0, _chai.expect)(changeSpy.firstCall.args[0]).to.be.an.instanceof(Date);
      (0, _chai.expect)(changeSpy.firstCall.args[0].toISOString()).to.equal((0, _moment.default)('2022-02-27T00:00:00.000Z').toISOString());
    });
    (0, _mocha.it)('updates when @value is changed externally', async function () {
      this.set('date', (0, _moment.default)('2022-02-22 22:22:22.000Z')).toDate();
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhDatePicker @value={{this.date}} />
      */
      {
        "id": "z1tF/r1P",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-date-picker\",[],[[\"@value\"],[[32,0,[\"date\"]]]],null]],\"hasEval\":false,\"upvars\":[]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-picker-input]'), 'date input').to.have.value('2022-02-22');
      this.set('date', (0, _moment.default)('2022-02-28 10:00:00.000Z')).toDate();
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-picker-input]'), 'date input').to.have.value('2022-02-28');
    });
    (0, _mocha.it)('updates when @value is changed externally when we have a scratch date', async function () {
      this.set('date', (0, _moment.default)('2022-02-22 22:22:22.000Z')).toDate();
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhDatePicker @value={{this.date}} />
      */
      {
        "id": "z1tF/r1P",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-date-picker\",[],[[\"@value\"],[[32,0,[\"date\"]]]],null]],\"hasEval\":false,\"upvars\":[]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-picker-input]'), 'date input').to.have.value('2022-02-22');
      await (0, _testHelpers.fillIn)('[data-test-date-picker-input]', '2022-02-27');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-picker-input]'), 'date input').to.have.value('2022-02-27');
      this.set('date', (0, _moment.default)('2022-02-28 10:00:00.000Z')).toDate();
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-picker-input]'), 'date input').to.have.value('2022-02-28');
    });
    (0, _mocha.it)('calls @onInput on input events', async function () {
      this.set('date', (0, _moment.default)('2022-02-22 22:22:22.000Z')).toDate();

      const inputSpy = _sinon.default.spy();

      this.set('onInput', inputSpy);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhDatePicker @value={{this.date}} @onInput={{this.onInput}} />
      */
      {
        "id": "tmm9NkXk",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-date-picker\",[],[[\"@value\",\"@onInput\"],[[32,0,[\"date\"]],[32,0,[\"onInput\"]]]],null]],\"hasEval\":false,\"upvars\":[]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _testHelpers.typeIn)('[data-test-date-picker-input]', 'lo');
      (0, _chai.expect)(inputSpy.callCount).to.equal(2);
      (0, _chai.expect)(inputSpy.firstCall.args[0]).to.be.instanceOf(Event);
    });
    (0, _mocha.it)('calls @onKeydown on input keydown events', async function () {
      this.set('date', (0, _moment.default)('2022-02-22 22:22:22.000Z')).toDate();

      const keydownSpy = _sinon.default.spy();

      this.set('onKeydown', keydownSpy);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhDatePicker @value={{this.date}} @onKeydown={{this.onKeydown}} />
      */
      {
        "id": "CbmLmyYY",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-date-picker\",[],[[\"@value\",\"@onKeydown\"],[[32,0,[\"date\"]],[32,0,[\"onKeydown\"]]]],null]],\"hasEval\":false,\"upvars\":[]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _testHelpers.typeIn)('[data-test-date-picker-input]', 'lo');
      (0, _chai.expect)(keydownSpy.callCount).to.equal(2);
      (0, _chai.expect)(keydownSpy.firstCall.args[0]).to.be.instanceOf(Event);
    });
    (0, _mocha.it)('calls @onBlur on input blur events', async function () {
      this.set('date', (0, _moment.default)('2022-02-22 22:22:22.000Z')).toDate();

      const blurSpy = _sinon.default.spy();

      this.set('onBlur', blurSpy);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhDatePicker @value={{this.date}} @onBlur={{this.onBlur}} />
      */
      {
        "id": "y5QRwcMf",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-date-picker\",[],[[\"@value\",\"@onBlur\"],[[32,0,[\"date\"]],[32,0,[\"onBlur\"]]]],null]],\"hasEval\":false,\"upvars\":[]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _testHelpers.focus)('[data-test-date-picker-input]');
      await (0, _testHelpers.blur)('[data-test-date-picker-input]');
      (0, _chai.expect)(blurSpy.callCount).to.equal(1);
      (0, _chai.expect)(blurSpy.firstCall.args[0]).to.be.instanceOf(Event);
    });
    (0, _mocha.it)('resets input value on Escape', async function () {
      this.set('date', (0, _moment.default)('2022-02-22 22:22:22.000Z')).toDate();

      const changeSpy = _sinon.default.spy();

      this.set('onChange', changeSpy);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhDatePicker @value={{this.date}} @onChange={{this.onChange}} />
      */
      {
        "id": "p0lk2HYY",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-date-picker\",[],[[\"@value\",\"@onChange\"],[[32,0,[\"date\"]],[32,0,[\"onChange\"]]]],null]],\"hasEval\":false,\"upvars\":[]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _testHelpers.fillIn)('[data-test-date-picker-input]', '2022-02-28');
      await (0, _testHelpers.triggerKeyEvent)('[data-test-date-picker-input]', 'keydown', 'Escape');
      (0, _chai.expect)(changeSpy.callCount).to.equal(0);
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-picker-input]')).to.have.value('2022-02-22');
    });
    (0, _mocha.it)('handles invalid date input', async function () {
      this.set('date', (0, _moment.default)('2022-02-22 22:22:22.000Z')).toDate();

      const changeSpy = _sinon.default.spy();

      this.set('onChange', changeSpy);

      const errorSpy = _sinon.default.spy();

      this.set('onError', errorSpy);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhDatePicker @value={{this.date}} @onChange={{this.onChange}} @onError={{this.onError}} />
      */
      {
        "id": "WLrWSle/",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-date-picker\",[],[[\"@value\",\"@onChange\",\"@onError\"],[[32,0,[\"date\"]],[32,0,[\"onChange\"]],[32,0,[\"onError\"]]]],null]],\"hasEval\":false,\"upvars\":[]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _testHelpers.fillIn)('[data-test-date-picker-input]', '2022-02-31');
      await (0, _testHelpers.blur)('[data-test-date-picker-input]');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-picker-error]')).to.have.text('Invalid date');
      (0, _chai.expect)(changeSpy.callCount, '@onChange call count').to.equal(0);
      (0, _chai.expect)(errorSpy.callCount, '@onError call count').to.equal(1);
      (0, _chai.expect)(errorSpy.firstCall.args[0]).to.be.instanceof(Error);
      (0, _chai.expect)(errorSpy.firstCall.args[0].message).to.equal('Invalid date');
    });
    (0, _mocha.it)('handles invalid date format input', async function () {
      this.set('date', (0, _moment.default)('2022-02-22 22:22:22.000Z')).toDate();

      const changeSpy = _sinon.default.spy();

      this.set('onChange', changeSpy);

      const errorSpy = _sinon.default.spy();

      this.set('onError', errorSpy);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhDatePicker @value={{this.date}} @onChange={{this.onChange}} @onError={{this.onError}} />
      */
      {
        "id": "WLrWSle/",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-date-picker\",[],[[\"@value\",\"@onChange\",\"@onError\"],[[32,0,[\"date\"]],[32,0,[\"onChange\"]],[32,0,[\"onError\"]]]],null]],\"hasEval\":false,\"upvars\":[]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _testHelpers.fillIn)('[data-test-date-picker-input]', 'narp');
      await (0, _testHelpers.blur)('[data-test-date-picker-input]');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-picker-error]')).to.contain.text('Date must be YYYY-MM-DD');
      (0, _chai.expect)(changeSpy.callCount, '@onChange call count').to.equal(0);
      (0, _chai.expect)(errorSpy.callCount, '@onError call count').to.equal(1);
      (0, _chai.expect)(errorSpy.firstCall.args[0]).to.be.instanceof(Error);
      (0, _chai.expect)(errorSpy.firstCall.args[0].message).to.contain('Date must be YYYY-MM-DD');
    });
    (0, _mocha.it)('clears error on internal change to valid', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhDatePicker @value={{this.date}} @onChange={{this.onChange}} @onError={{this.onError}} />
      */
      {
        "id": "WLrWSle/",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-date-picker\",[],[[\"@value\",\"@onChange\",\"@onError\"],[[32,0,[\"date\"]],[32,0,[\"onChange\"]],[32,0,[\"onError\"]]]],null]],\"hasEval\":false,\"upvars\":[]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _testHelpers.fillIn)('[data-test-date-picker-input]', 'narp');
      await (0, _testHelpers.blur)('[data-test-date-picker-input]');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-picker-error]')).to.exist;
      await (0, _testHelpers.fillIn)('[data-test-date-picker-input]', '2022-02-22');
      await (0, _testHelpers.blur)('[data-test-date-picker-input]');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-picker-error]')).to.not.exist;
    });
    (0, _mocha.it)('clears error on external @value change to valid', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhDatePicker @value={{this.date}} @onChange={{this.onChange}} @onError={{this.onError}} />
      */
      {
        "id": "WLrWSle/",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-date-picker\",[],[[\"@value\",\"@onChange\",\"@onError\"],[[32,0,[\"date\"]],[32,0,[\"onChange\"]],[32,0,[\"onError\"]]]],null]],\"hasEval\":false,\"upvars\":[]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _testHelpers.fillIn)('[data-test-date-picker-input]', 'narp');
      await (0, _testHelpers.blur)('[data-test-date-picker-input]');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-picker-error]')).to.exist;
      this.set('date', (0, _moment.default)('2022-02-22'));
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-picker-error]')).to.not.exist;
    });
    (0, _mocha.it)('clears error on reset', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhDatePicker @value={{this.date}} @onChange={{this.onChange}} @onError={{this.onError}} />
      */
      {
        "id": "WLrWSle/",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-date-picker\",[],[[\"@value\",\"@onChange\",\"@onError\"],[[32,0,[\"date\"]],[32,0,[\"onChange\"]],[32,0,[\"onError\"]]]],null]],\"hasEval\":false,\"upvars\":[]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _testHelpers.fillIn)('[data-test-date-picker-input]', 'narp');
      await (0, _testHelpers.blur)('[data-test-date-picker-input]');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-picker-error]')).to.exist;
      await (0, _testHelpers.triggerKeyEvent)('[data-test-date-picker-input]', 'keydown', 'Escape');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-picker-error]')).to.not.exist;
    });
    (0, _mocha.describe)('min/max', function () {
      (0, _mocha.it)('disables datepicker dates outside of range', async function () {
        this.set('date', (0, _moment.default)('2022-02-22 22:22:22.000Z')).toDate();
        this.set('minDate', (0, _moment.default)('2022-02-11 12:00:00.000Z').toDate());
        this.set('maxDate', (0, _moment.default)('2022-02-24 12:00:00.000Z').toDate());
        await (0, _testHelpers.render)(Ember.HTMLBars.template(
        /*
          <GhDatePicker @value={{this.date}} @minDate={{this.minDate}} @maxDate={{this.maxDate}} />
        */
        {
          "id": "j3HIsNq5",
          "block": "{\"symbols\":[],\"statements\":[[8,\"gh-date-picker\",[],[[\"@value\",\"@minDate\",\"@maxDate\"],[[32,0,[\"date\"]],[32,0,[\"minDate\"]],[32,0,[\"maxDate\"]]]],null]],\"hasEval\":false,\"upvars\":[]}",
          "moduleName": "(unknown template module)"
        }));
        await (0, _testHelpers.click)('[data-test-date-picker-trigger]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-date="2022-02-10"]')).to.have.attribute('disabled');
        (0, _chai.expect)((0, _testHelpers.find)('[data-date="2022-02-25"]')).to.have.attribute('disabled');
      });
      (0, _mocha.it)('errors when date input is earlier than min', async function () {
        this.set('date', (0, _moment.default)('2022-02-22 22:22:22.000Z')).toDate();
        this.set('minDate', (0, _moment.default)('2022-02-11 12:00:00.000Z').toDate());

        const changeSpy = _sinon.default.spy();

        this.set('onChange', changeSpy);

        const errorSpy = _sinon.default.spy();

        this.set('onError', errorSpy);
        await (0, _testHelpers.render)(Ember.HTMLBars.template(
        /*
          <GhDatePicker @value={{this.date}} @minDate={{this.minDate}} @onChange={{this.onChange}} @onError={{this.onError}} />
        */
        {
          "id": "KtDjCO6W",
          "block": "{\"symbols\":[],\"statements\":[[8,\"gh-date-picker\",[],[[\"@value\",\"@minDate\",\"@onChange\",\"@onError\"],[[32,0,[\"date\"]],[32,0,[\"minDate\"]],[32,0,[\"onChange\"]],[32,0,[\"onError\"]]]],null]],\"hasEval\":false,\"upvars\":[]}",
          "moduleName": "(unknown template module)"
        }));
        await (0, _testHelpers.fillIn)('[data-test-date-picker-input]', '2022-02-10');
        await (0, _testHelpers.blur)('[data-test-date-picker-input]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-picker-error]')).to.have.text('Must be on or after 2022-02-11');
        (0, _chai.expect)(changeSpy.callCount, '@onChange call count').to.equal(0);
        (0, _chai.expect)(errorSpy.callCount, '@onError call count').to.equal(1);
        (0, _chai.expect)(errorSpy.firstCall.args[0]).to.be.instanceof(Error);
        (0, _chai.expect)(errorSpy.firstCall.args[0].message).to.equal('Must be on or after 2022-02-11');
        (0, _chai.expect)(errorSpy.firstCall.args[0].date).to.be.equal('2022-02-10');
      });
      (0, _mocha.it)('allows for min date error override', async function () {
        this.set('date', (0, _moment.default)('2022-02-22 22:22:22.000Z')).toDate();
        this.set('minDate', (0, _moment.default)('2022-02-11 12:00:00.000Z').toDate());
        await (0, _testHelpers.render)(Ember.HTMLBars.template(
        /*
          <GhDatePicker @value={{this.date}} @minDate={{this.minDate}} @minDateError="Must be in the future" @onChange={{this.onChange}} />
        */
        {
          "id": "m2ff3kw4",
          "block": "{\"symbols\":[],\"statements\":[[8,\"gh-date-picker\",[],[[\"@value\",\"@minDate\",\"@minDateError\",\"@onChange\"],[[32,0,[\"date\"]],[32,0,[\"minDate\"]],\"Must be in the future\",[32,0,[\"onChange\"]]]],null]],\"hasEval\":false,\"upvars\":[]}",
          "moduleName": "(unknown template module)"
        }));
        await (0, _testHelpers.fillIn)('[data-test-date-picker-input]', '2022-02-10');
        await (0, _testHelpers.blur)('[data-test-date-picker-input]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-picker-error]')).to.have.text('Must be in the future');
      });
      (0, _mocha.it)('errors when date input is later than max', async function () {
        this.set('date', (0, _moment.default)('2022-02-22 22:22:22.000Z')).toDate();
        this.set('maxDate', (0, _moment.default)('2022-02-25 12:00:00.000Z').toDate());

        const changeSpy = _sinon.default.spy();

        this.set('onChange', changeSpy);

        const errorSpy = _sinon.default.spy();

        this.set('onError', errorSpy);
        await (0, _testHelpers.render)(Ember.HTMLBars.template(
        /*
          <GhDatePicker @value={{this.date}} @maxDate={{this.maxDate}} @onChange={{this.onChange}} @onError={{this.onError}} />
        */
        {
          "id": "IE1dOesr",
          "block": "{\"symbols\":[],\"statements\":[[8,\"gh-date-picker\",[],[[\"@value\",\"@maxDate\",\"@onChange\",\"@onError\"],[[32,0,[\"date\"]],[32,0,[\"maxDate\"]],[32,0,[\"onChange\"]],[32,0,[\"onError\"]]]],null]],\"hasEval\":false,\"upvars\":[]}",
          "moduleName": "(unknown template module)"
        }));
        await (0, _testHelpers.fillIn)('[data-test-date-picker-input]', '2022-02-28');
        await (0, _testHelpers.blur)('[data-test-date-picker-input]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-picker-error]')).to.have.text('Must be on or before 2022-02-25');
        (0, _chai.expect)(changeSpy.callCount, '@onChange call count').to.equal(0);
        (0, _chai.expect)(errorSpy.callCount, '@onError call count').to.equal(1);
        (0, _chai.expect)(errorSpy.firstCall.args[0]).to.be.instanceof(Error);
        (0, _chai.expect)(errorSpy.firstCall.args[0].message).to.equal('Must be on or before 2022-02-25');
        (0, _chai.expect)(errorSpy.firstCall.args[0].date).to.be.equal('2022-02-28');
      });
      (0, _mocha.it)('allows for max date error override', async function () {
        this.set('date', (0, _moment.default)('2022-02-22 22:22:22.000Z')).toDate();
        this.set('maxDate', (0, _moment.default)('2022-02-25 12:00:00.000Z').toDate());
        await (0, _testHelpers.render)(Ember.HTMLBars.template(
        /*
          <GhDatePicker @value={{this.date}} @maxDate={{this.maxDate}} @maxDateError="Must be in the past" @onChange={{this.onChange}} />
        */
        {
          "id": "9n6fpUw0",
          "block": "{\"symbols\":[],\"statements\":[[8,\"gh-date-picker\",[],[[\"@value\",\"@maxDate\",\"@maxDateError\",\"@onChange\"],[[32,0,[\"date\"]],[32,0,[\"maxDate\"]],\"Must be in the past\",[32,0,[\"onChange\"]]]],null]],\"hasEval\":false,\"upvars\":[]}",
          "moduleName": "(unknown template module)"
        }));
        await (0, _testHelpers.fillIn)('[data-test-date-picker-input]', '2022-02-28');
        await (0, _testHelpers.blur)('[data-test-date-picker-input]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-picker-error]')).to.have.text('Must be in the past');
      });
    });
    (0, _mocha.describe)('block invocation', function () {
      (0, _mocha.it)('exposes Nav and Days components', async function () {
        clock = _sinon.default.useFakeTimers({
          now: (0, _moment.default)('2022-02-02 22:22:22.000Z').toDate()
        });
        this.set('date', (0, _moment.default)('2022-02-02 22:22:22.000Z')).toDate();
        this.set('maxDate', (0, _moment.default)('2022-02-05 12:00:00.000Z').toDate());
        await (0, _testHelpers.render)(Ember.HTMLBars.template(
        /*
          <GhDatePicker @value={{this.date}} @maxDate={{this.maxDate}} as |dp|><dp.Nav /><dp.Days /></GhDatePicker>
        */
        {
          "id": "LUaXw9i1",
          "block": "{\"symbols\":[\"dp\"],\"statements\":[[8,\"gh-date-picker\",[],[[\"@value\",\"@maxDate\"],[[32,0,[\"date\"]],[32,0,[\"maxDate\"]]]],[[\"default\"],[{\"statements\":[[8,[32,1,[\"Nav\"]],[],[[],[]],null],[8,[32,1,[\"Days\"]],[],[[],[]],null]],\"parameters\":[1]}]]]],\"hasEval\":false,\"upvars\":[]}",
          "moduleName": "(unknown template module)"
        }));
        await (0, _testHelpers.click)('[data-test-date-picker-trigger]'); // calendar is rendered with the right maxDate value curried

        (0, _chai.expect)((0, _testHelpers.find)('[data-date="2022-02-10"]')).to.have.attribute('disabled');
        (0, _chai.expect)((0, _testHelpers.find)('[data-date="2022-02-25"]')).to.have.attribute('disabled');
      });
    });
  });
});
define("ghost-admin/tests/integration/components/gh-date-time-picker-test", ["moment", "sinon", "@ember/test-helpers", "ember-power-datepicker/test-support", "mocha", "chai", "ember-mocha"], function (_moment, _sinon, _testHelpers, _testSupport, _mocha, _chai, _emberMocha) {
  "use strict";

  function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

  class SettingsStub extends Ember.Service {
    constructor() {
      super(...arguments);

      _defineProperty(this, "timezone", 'Etc/UTC');
    }

    get(key) {
      if (key === 'timezone') {
        return this.timezone;
      }
    }

  }

  window.__CLASSIC_OWN_CLASSES__.set(SettingsStub, true);

  (0, _mocha.describe)('Integration: Component: gh-date-time-picker', function () {
    (0, _emberMocha.setupRenderingTest)();
    let clock;
    beforeEach(async function () {
      this.owner.register('service:settings', SettingsStub);
    });
    afterEach(function () {
      clock?.restore();
    });
    (0, _mocha.it)('renders', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhDateTimePicker />
      */
      {
        "id": "EZvDtGeY",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-date-time-picker\",[],[[],[]],null]],\"hasEval\":false,\"upvars\":[]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-component="gh-date-time-picker"]'), 'component wrapper').to.exist;
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-time-picker-datepicker]'), 'datepicker trigger').to.exist;
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-time-picker-date-input]'), 'datepicker input').to.exist;
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-time-picker-time-input]'), 'time input').to.exist;
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-time-picker-timezone]')).to.contain.text('UTC');
    });
    (0, _mocha.it)('defaults to now when @date is empty', async function () {
      clock = _sinon.default.useFakeTimers({
        now: (0, _moment.default)('2022-02-22 22:22:22.000Z').toDate()
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhDateTimePicker />
      */
      {
        "id": "EZvDtGeY",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-date-time-picker\",[],[[],[]],null]],\"hasEval\":false,\"upvars\":[]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-time-picker-date-input]'), 'date input').to.have.value('2022-02-22');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-time-picker-time-input]'), 'time input').to.have.value('22:22');
    });
    (0, _mocha.it)('shows passed in @date value', async function () {
      this.set('date', (0, _moment.default)('2022-02-22 22:22:22.000Z')).toDate();
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhDateTimePicker @date={{this.date}} />
      */
      {
        "id": "w0L0VGJ4",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-date-time-picker\",[],[[\"@date\"],[[32,0,[\"date\"]]]],null]],\"hasEval\":false,\"upvars\":[]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-time-picker-date-input]'), 'date input').to.have.value('2022-02-22');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-time-picker-time-input]'), 'time input').to.have.value('22:22');
    });
    (0, _mocha.it)('uses separate @time value', async function () {
      this.set('date', (0, _moment.default)('2022-02-22 22:22:22.000Z')).toDate();
      this.set('time', '12:00');
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhDateTimePicker @date={{this.date}} @time={{this.time}} />
      */
      {
        "id": "q9a3Rdmg",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-date-time-picker\",[],[[\"@date\",\"@time\"],[[32,0,[\"date\"]],[32,0,[\"time\"]]]],null]],\"hasEval\":false,\"upvars\":[]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-time-picker-date-input]'), 'date input').to.have.value('2022-02-22');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-time-picker-time-input]'), 'time input').to.have.value('12:00');
    });
    (0, _mocha.it)('can update date via date input', async function () {
      this.set('date', (0, _moment.default)('2022-02-22 22:22:22.000Z')).toDate();
      this.set('time', '22:22');
      this.set('updateDate', newDate => {
        (0, _chai.expect)((0, _moment.default)(newDate).toISOString()).to.equal('2022-02-28T00:00:00.000Z');
        this.set('date', newDate);
      });
      this.set('updateTime', newTime => {
        (0, _chai.expect)(newTime).to.equal('22:22');
        this.set('time', newTime);
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhDateTimePicker @date={{this.date}} @time={{this.time}} @setDate={{this.updateDate}} @setTime={{this.updateTime}} />
      */
      {
        "id": "eDhxwUDR",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-date-time-picker\",[],[[\"@date\",\"@time\",\"@setDate\",\"@setTime\"],[[32,0,[\"date\"]],[32,0,[\"time\"]],[32,0,[\"updateDate\"]],[32,0,[\"updateTime\"]]]],null]],\"hasEval\":false,\"upvars\":[]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _testHelpers.fillIn)('[data-test-date-time-picker-date-input]', '2022-02-28');
      await (0, _testHelpers.blur)('[data-test-date-time-picker-date-input]');
    });
    (0, _mocha.it)('can update time via time input', async function () {
      this.set('date', (0, _moment.default)('2022-02-22 22:22:22.000Z')).toDate();
      this.set('time', '22:22');
      this.set('updateDate', newDate => {
        (0, _chai.expect)((0, _moment.default)(newDate).toISOString()).to.equal('2022-02-28T00:00:00.000Z');
        this.set('date', newDate);
      });
      this.set('updateTime', newTime => {
        (0, _chai.expect)(newTime).to.equal('18:00');
        this.set('time', newTime);
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhDateTimePicker @date={{this.date}} @time={{this.time}} @setDate={{this.updateDate}} @setTime={{this.updateTime}} />
      */
      {
        "id": "eDhxwUDR",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-date-time-picker\",[],[[\"@date\",\"@time\",\"@setDate\",\"@setTime\"],[[32,0,[\"date\"]],[32,0,[\"time\"]],[32,0,[\"updateDate\"]],[32,0,[\"updateTime\"]]]],null]],\"hasEval\":false,\"upvars\":[]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _testHelpers.fillIn)('[data-test-date-time-picker-time-input]', '18:00');
      await (0, _testHelpers.blur)('[data-test-date-time-picker-time-input]');
    });
    (0, _mocha.it)('can update date via datepicker', async function () {
      this.set('date', (0, _moment.default)('2022-02-22 22:22:22.000Z')).toDate();
      this.set('time', '12:00');
      this.set('updateDate', newDate => {
        (0, _chai.expect)((0, _moment.default)(newDate).toISOString()).to.equal('2022-02-27T00:00:00.000Z');
        this.set('date', newDate);
      });
      this.set('updateTime', newTime => {
        (0, _chai.expect)(newTime).to.equal('12:00');
        this.set('time', newTime);
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhDateTimePicker @date={{this.date}} @time={{this.time}} @setDate={{this.updateDate}} @setTime={{this.updateTime}} />
      */
      {
        "id": "eDhxwUDR",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-date-time-picker\",[],[[\"@date\",\"@time\",\"@setDate\",\"@setTime\"],[[32,0,[\"date\"]],[32,0,[\"time\"]],[32,0,[\"updateDate\"]],[32,0,[\"updateTime\"]]]],null]],\"hasEval\":false,\"upvars\":[]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _testSupport.datepickerSelect)('[data-test-date-time-picker-datepicker]', (0, _moment.default)('2022-02-27T13:00:00.000Z').toDate());
    });
    (0, _mocha.it)('updates when @date is changed externally', async function () {
      this.set('date', (0, _moment.default)('2022-02-22 22:22:22.000Z')).toDate();
      this.set('time', '12:00');
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhDateTimePicker @date={{this.date}} @time={{this.time}} />
      */
      {
        "id": "q9a3Rdmg",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-date-time-picker\",[],[[\"@date\",\"@time\"],[[32,0,[\"date\"]],[32,0,[\"time\"]]]],null]],\"hasEval\":false,\"upvars\":[]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-time-picker-date-input]'), 'date input').to.have.value('2022-02-22');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-time-picker-time-input]'), 'time input').to.have.value('12:00');
      this.set('date', (0, _moment.default)('2022-02-28 10:00:00.000Z')).toDate();
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-time-picker-date-input]'), 'date input').to.have.value('2022-02-28');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-time-picker-time-input]'), 'time input').to.have.value('12:00');
    });
    (0, _mocha.it)('updates when @time is changed externally', async function () {
      this.set('date', (0, _moment.default)('2022-02-22 22:22:22.000Z')).toDate();
      this.set('time', '12:00');
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhDateTimePicker @date={{this.date}} @time={{this.time}} />
      */
      {
        "id": "q9a3Rdmg",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-date-time-picker\",[],[[\"@date\",\"@time\"],[[32,0,[\"date\"]],[32,0,[\"time\"]]]],null]],\"hasEval\":false,\"upvars\":[]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-time-picker-date-input]'), 'date input').to.have.value('2022-02-22');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-time-picker-time-input]'), 'time input').to.have.value('12:00');
      this.set('time', '08:00');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-time-picker-date-input]'), 'date input').to.have.value('2022-02-22');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-time-picker-time-input]'), 'time input').to.have.value('08:00');
    });
    (0, _mocha.it)('handles invalid date input', async function () {
      this.set('date', (0, _moment.default)('2022-02-22 22:22:22.000Z')).toDate();
      this.set('time', '12:00');

      const dateSpy = _sinon.default.spy();

      this.set('updateDate', dateSpy);

      const timeSpy = _sinon.default.spy();

      this.set('updateTime', timeSpy);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhDateTimePicker @date={{this.date}} @time={{this.time}} @setDate={{this.updateDate}} @setTime={{this.updateTime}} />
      */
      {
        "id": "eDhxwUDR",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-date-time-picker\",[],[[\"@date\",\"@time\",\"@setDate\",\"@setTime\"],[[32,0,[\"date\"]],[32,0,[\"time\"]],[32,0,[\"updateDate\"]],[32,0,[\"updateTime\"]]]],null]],\"hasEval\":false,\"upvars\":[]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _testHelpers.fillIn)('[data-test-date-time-picker-date-input]', '2022-02-31');
      await (0, _testHelpers.blur)('[data-test-date-time-picker-date-input]');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-time-picker-error]')).to.have.text('Invalid date');
      await (0, _testHelpers.fillIn)('[data-test-date-time-picker-date-input]', 'narp');
      await (0, _testHelpers.blur)('[data-test-date-time-picker-date-input]');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-date-time-picker-error]')).to.contain.text('Invalid date format');
      (0, _chai.expect)(dateSpy.callCount, '@setDate call count').to.equal(0);
      (0, _chai.expect)(timeSpy.callCount, '@setTime call count').to.equal(0);
    }); // TODO: move time format handling into component?
    // it('handles invalid time input', async function () {
    //     this.set('date', moment('2022-02-22 22:22:22.000Z')).toDate();
    //     this.set('time', '12:00');
    //     const dateSpy = sinon.spy();
    //     this.set('updateDate', dateSpy);
    //     const timeSpy = sinon.spy();
    //     this.set('updateTime', timeSpy);
    //     await render(hbs`<GhDateTimePicker @date={{this.date}} @time={{this.time}} @setDate={{this.updateDate}} @setTime={{this.updateTime}} />`);
    //     await fillIn('[data-test-date-time-picker-time-input]', '24:59');
    //     await blur('[data-test-date-time-picker-time-input]');
    //     expect(dateSpy.callCount, '@setDate call count').to.equal(0);
    //     expect(timeSpy.callCount, '@setTime call count').to.equal(0);
    //     expect(find('[data-test-date-time-picker-error]')).to.have.text('Invalid time');
    //     await fillIn('[data-test-date-time-picker-time-input]', 'narp');
    //     await blur('[data-test-date-time-picker-time-input]');
    //     expect(find('[data-test-date-time-picker-error]')).to.contain.text('Invalid time format');
    // });

    (0, _mocha.describe)('min/max', function () {
      (0, _mocha.it)('disables datepicker dates outside of range', async function () {
        this.set('date', (0, _moment.default)('2022-02-22 22:22:22.000Z')).toDate();
        this.set('time', '12:00');
        this.set('minDate', (0, _moment.default)('2022-02-11 12:00:00.000Z').toDate());
        this.set('maxDate', (0, _moment.default)('2022-02-24 12:00:00.000Z').toDate());
        await (0, _testHelpers.render)(Ember.HTMLBars.template(
        /*
          <GhDateTimePicker @date={{this.date}} @time={{this.time}} @minDate={{this.minDate}} @maxDate={{this.maxDate}} />
        */
        {
          "id": "2bf/Xlmc",
          "block": "{\"symbols\":[],\"statements\":[[8,\"gh-date-time-picker\",[],[[\"@date\",\"@time\",\"@minDate\",\"@maxDate\"],[[32,0,[\"date\"]],[32,0,[\"time\"]],[32,0,[\"minDate\"]],[32,0,[\"maxDate\"]]]],null]],\"hasEval\":false,\"upvars\":[]}",
          "moduleName": "(unknown template module)"
        }));
        await (0, _testHelpers.click)('[data-test-date-time-picker-datepicker]');
        (0, _chai.expect)((0, _testHelpers.find)('[data-date="2022-02-10"]')).to.have.attribute('disabled');
        (0, _chai.expect)((0, _testHelpers.find)('[data-date="2022-02-25"]')).to.have.attribute('disabled');
      }); // TODO: move date validation into component?
      // it('errors when date input is earlier than min', async function () {
      //     this.set('date', moment('2022-02-22 22:22:22.000Z')).toDate();
      //     this.set('time', '12:00');
      //     this.set('minDate', moment('2022-02-11 12:00:00.000Z').toDate());
      //     const dateSpy = sinon.spy();
      //     this.set('updateDate', dateSpy);
      //     const timeSpy = sinon.spy();
      //     this.set('updateTime', timeSpy);
      //     await render(hbs`<GhDateTimePicker @date={{this.date}} @time={{this.time}} @minDate={{this.minDate}} @setDate={{this.updateDate}} @setTime={{this.updateTime}} />`);
      //     await fillIn('[data-test-date-time-picker-date-input]', '2022-02-10');
      //     await blur('[data-test-date-time-picker-date-input]');
      //     expect(dateSpy.callCount, '@setDate call count').to.equal(0);
      //     expect(timeSpy.callCount, '@setTime call count').to.equal(0);
      // });
      // it('errors when date input is later than max');
      // it('errors when time input is earlier than min');
      // it('errors when time input is later than max');
    });
  });
});
define("ghost-admin/tests/integration/components/gh-distribution-action-select-test", ["ghost-admin/mirage/config/posts", "mocha", "chai", "@ember/test-helpers", "ember-mocha", "ghost-admin/initializers/ember-cli-mirage"], function (_posts, _mocha, _chai, _testHelpers, _emberMocha, _emberCliMirage) {
  "use strict";

  (0, _mocha.describe)('Integration: Component: gh-distribution-action-select', function () {
    (0, _emberMocha.setupRenderingTest)();
    let server;
    beforeEach(function () {
      server = (0, _emberCliMirage.startMirage)();
      let author = server.create('user');
      (0, _posts.default)(server);
      server.create('post', {
        authors: [author]
      });
      this.set('store', this.owner.lookup('service:store'));
    });
    afterEach(function () {
      server.shutdown();
    });
    (0, _mocha.it)('renders', async function () {
      this.set('post', this.store.findRecord('post', 1));
      await (0, _testHelpers.settled)();
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhDistributionActionSelect @post=post />
      */
      {
        "id": "cKyQf52F",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-distribution-action-select\",[],[[\"@post\"],[\"post\"]],null]],\"hasEval\":false,\"upvars\":[]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)(this.element, 'top-level elements').to.exist;
    });
  });
});
define("ghost-admin/tests/integration/components/gh-feature-flag-test", ["@ember/test-helpers", "mocha", "chai", "ember-mocha"], function (_testHelpers, _mocha, _chai, _emberMocha) {
  "use strict";

  const featureStub = Ember.Service.extend({
    testFlag: true
  });
  (0, _mocha.describe)('Integration: Component: gh-feature-flag', function () {
    (0, _emberMocha.setupRenderingTest)();
    beforeEach(function () {
      this.owner.register('service:feature', featureStub);
    });
    (0, _mocha.it)('renders properties correctly', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhFeatureFlag @flag="testFlag" />
      */
      {
        "id": "lpKyB+kC",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-feature-flag\",[],[[\"@flag\"],[\"testFlag\"]],null]],\"hasEval\":false,\"upvars\":[]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.find)('label').getAttribute('for')).to.equal((0, _testHelpers.find)('input[type="checkbox"]').id);
    });
    (0, _mocha.it)('renders correctly when flag is set to true', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhFeatureFlag @flag="testFlag" />
      */
      {
        "id": "lpKyB+kC",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-feature-flag\",[],[[\"@flag\"],[\"testFlag\"]],null]],\"hasEval\":false,\"upvars\":[]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.find)('label input[type="checkbox"]').checked).to.be.true;
    });
    (0, _mocha.it)('renders correctly when flag is set to false', async function () {
      let feature = this.owner.lookup('service:feature');
      feature.set('testFlag', false);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhFeatureFlag @flag="testFlag" />
      */
      {
        "id": "lpKyB+kC",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-feature-flag\",[],[[\"@flag\"],[\"testFlag\"]],null]],\"hasEval\":false,\"upvars\":[]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.find)('label input[type="checkbox"]').checked).to.be.false;
    });
    (0, _mocha.it)('updates to reflect changes in flag property', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhFeatureFlag @flag="testFlag" />
      */
      {
        "id": "lpKyB+kC",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-feature-flag\",[],[[\"@flag\"],[\"testFlag\"]],null]],\"hasEval\":false,\"upvars\":[]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.find)('label input[type="checkbox"]').checked).to.be.true;
      await (0, _testHelpers.click)('label');
      (0, _chai.expect)((0, _testHelpers.find)('label input[type="checkbox"]').checked).to.be.false;
    });
  });
});
define("ghost-admin/tests/integration/components/gh-file-uploader-test", ["jquery", "pretender", "ghost-admin/utils/ghost-paths", "sinon", "ghost-admin/services/ajax", "@ember/test-helpers", "ghost-admin/tests/helpers/file-upload", "mocha", "chai", "ember-mocha"], function (_jquery, _pretender, _ghostPaths, _sinon, _ajax, _testHelpers, _fileUpload, _mocha, _chai, _emberMocha) {
  "use strict";

  const notificationsStub = Ember.Service.extend({
    showAPIError() {// noop - to be stubbed
    }

  });

  const stubSuccessfulUpload = function (server) {
    let delay = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
    server.post(`${(0, _ghostPaths.default)().apiRoot}/images/`, function () {
      return [200, {
        'Content-Type': 'application/json'
      }, '{"url":"/content/images/test.png"}'];
    }, delay);
  };

  const stubFailedUpload = function (server, code, error) {
    let delay = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;
    server.post(`${(0, _ghostPaths.default)().apiRoot}/images/`, function () {
      return [code, {
        'Content-Type': 'application/json'
      }, JSON.stringify({
        errors: [{
          type: error,
          message: `Error: ${error}`
        }]
      })];
    }, delay);
  };

  (0, _mocha.describe)('Integration: Component: gh-file-uploader', function () {
    (0, _emberMocha.setupRenderingTest)();
    let server;
    beforeEach(function () {
      server = new _pretender.default();
      this.set('uploadUrl', `${(0, _ghostPaths.default)().apiRoot}/images/`);
      this.owner.register('service:notifications', notificationsStub);
    });
    afterEach(function () {
      server.shutdown();
    });
    (0, _mocha.it)('renders', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-file-uploader}}
      */
      {
        "id": "DVe0RFn2",
        "block": "{\"symbols\":[],\"statements\":[[1,[34,0]]],\"hasEval\":false,\"upvars\":[\"gh-file-uploader\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.find)('label').textContent.trim(), 'default label').to.equal('Select or drag-and-drop a file');
    });
    (0, _mocha.it)('allows file input "accept" attribute to be changed', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-file-uploader}}
      */
      {
        "id": "DVe0RFn2",
        "block": "{\"symbols\":[],\"statements\":[[1,[34,0]]],\"hasEval\":false,\"upvars\":[\"gh-file-uploader\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.find)('input[type="file"]').getAttribute('accept'), 'default "accept" attribute').to.equal('text/csv');
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-file-uploader accept="application/zip"}}
      */
      {
        "id": "7+me41JW",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,0],null,[[\"accept\"],[\"application/zip\"]]]]],\"hasEval\":false,\"upvars\":[\"gh-file-uploader\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.find)('input[type="file"]').getAttribute('accept'), 'specified "accept" attribute').to.equal('application/zip');
    });
    (0, _mocha.it)('renders form with supplied label text', async function () {
      this.set('labelText', 'My label');
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-file-uploader labelText=labelText}}
      */
      {
        "id": "kHqUN39K",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,1],null,[[\"labelText\"],[[35,0]]]]]],\"hasEval\":false,\"upvars\":[\"labelText\",\"gh-file-uploader\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.find)('label').textContent.trim(), 'label').to.equal('My label');
    });
    (0, _mocha.it)('generates request to supplied endpoint', async function () {
      stubSuccessfulUpload(server);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-file-uploader url=uploadUrl}}
      */
      {
        "id": "u+hL5Tfp",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,1],null,[[\"url\"],[[35,0]]]]]],\"hasEval\":false,\"upvars\":[\"uploadUrl\",\"gh-file-uploader\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.csv'
      });
      (0, _chai.expect)(server.handledRequests.length).to.equal(1);
      (0, _chai.expect)(server.handledRequests[0].url).to.equal(`${(0, _ghostPaths.default)().apiRoot}/images/`);
    });
    (0, _mocha.it)('fires uploadSuccess action on successful upload', async function () {
      let uploadSuccess = _sinon.default.spy();

      this.set('uploadSuccess', uploadSuccess);
      stubSuccessfulUpload(server);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-file-uploader url=uploadUrl uploadSuccess=(action uploadSuccess)}}
      */
      {
        "id": "bBuqHDDe",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,3],null,[[\"url\",\"uploadSuccess\"],[[35,2],[30,[36,1],[[32,0],[35,0]],null]]]]]],\"hasEval\":false,\"upvars\":[\"uploadSuccess\",\"action\",\"uploadUrl\",\"gh-file-uploader\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.csv'
      });
      (0, _chai.expect)(uploadSuccess.calledOnce).to.be.true;
      (0, _chai.expect)(uploadSuccess.firstCall.args[0]).to.eql({
        url: '/content/images/test.png'
      });
    });
    (0, _mocha.it)('doesn\'t fire uploadSuccess action on failed upload', async function () {
      let uploadSuccess = _sinon.default.spy();

      this.set('uploadSuccess', uploadSuccess);
      stubFailedUpload(server, 500);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-file-uploader url=uploadUrl uploadSuccess=(action uploadSuccess)}}
      */
      {
        "id": "bBuqHDDe",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,3],null,[[\"url\",\"uploadSuccess\"],[[35,2],[30,[36,1],[[32,0],[35,0]],null]]]]]],\"hasEval\":false,\"upvars\":[\"uploadSuccess\",\"action\",\"uploadUrl\",\"gh-file-uploader\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.csv'
      });
      await (0, _testHelpers.settled)();
      (0, _chai.expect)(uploadSuccess.calledOnce).to.be.false;
    });
    (0, _mocha.it)('fires fileSelected action on file selection', async function () {
      let fileSelected = _sinon.default.spy();

      this.set('fileSelected', fileSelected);
      stubSuccessfulUpload(server);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-file-uploader url=uploadUrl fileSelected=(action fileSelected)}}
      */
      {
        "id": "Uu4UtzOg",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,3],null,[[\"url\",\"fileSelected\"],[[35,2],[30,[36,1],[[32,0],[35,0]],null]]]]]],\"hasEval\":false,\"upvars\":[\"fileSelected\",\"action\",\"uploadUrl\",\"gh-file-uploader\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.csv'
      });
      (0, _chai.expect)(fileSelected.calledOnce).to.be.true;
      (0, _chai.expect)(fileSelected.args[0]).to.not.be.empty;
    });
    (0, _mocha.it)('fires uploadStarted action on upload start', async function () {
      let uploadStarted = _sinon.default.spy();

      this.set('uploadStarted', uploadStarted);
      stubSuccessfulUpload(server);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-file-uploader url=uploadUrl uploadStarted=(action uploadStarted)}}
      */
      {
        "id": "8zmyk4EA",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,3],null,[[\"url\",\"uploadStarted\"],[[35,2],[30,[36,1],[[32,0],[35,0]],null]]]]]],\"hasEval\":false,\"upvars\":[\"uploadStarted\",\"action\",\"uploadUrl\",\"gh-file-uploader\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.csv'
      });
      (0, _chai.expect)(uploadStarted.calledOnce).to.be.true;
    });
    (0, _mocha.it)('fires uploadFinished action on successful upload', async function () {
      let uploadFinished = _sinon.default.spy();

      this.set('uploadFinished', uploadFinished);
      stubSuccessfulUpload(server);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-file-uploader url=uploadUrl uploadFinished=(action uploadFinished)}}
      */
      {
        "id": "MoSzAQ6b",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,3],null,[[\"url\",\"uploadFinished\"],[[35,2],[30,[36,1],[[32,0],[35,0]],null]]]]]],\"hasEval\":false,\"upvars\":[\"uploadFinished\",\"action\",\"uploadUrl\",\"gh-file-uploader\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.csv'
      });
      (0, _chai.expect)(uploadFinished.calledOnce).to.be.true;
    });
    (0, _mocha.it)('fires uploadFinished action on failed upload', async function () {
      let uploadFinished = _sinon.default.spy();

      this.set('uploadFinished', uploadFinished);
      stubFailedUpload(server);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-file-uploader url=uploadUrl uploadFinished=(action uploadFinished)}}
      */
      {
        "id": "MoSzAQ6b",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,3],null,[[\"url\",\"uploadFinished\"],[[35,2],[30,[36,1],[[32,0],[35,0]],null]]]]]],\"hasEval\":false,\"upvars\":[\"uploadFinished\",\"action\",\"uploadUrl\",\"gh-file-uploader\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.csv'
      });
      (0, _chai.expect)(uploadFinished.calledOnce).to.be.true;
    });
    (0, _mocha.it)('displays invalid file type error', async function () {
      stubFailedUpload(server, 415, 'UnsupportedMediaTypeError');
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-file-uploader url=uploadUrl}}
      */
      {
        "id": "u+hL5Tfp",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,1],null,[[\"url\"],[[35,0]]]]]],\"hasEval\":false,\"upvars\":[\"uploadUrl\",\"gh-file-uploader\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.csv'
      });
      (0, _chai.expect)((0, _testHelpers.findAll)('.failed').length, 'error message is displayed').to.equal(1);
      (0, _chai.expect)((0, _testHelpers.find)('.failed').textContent).to.match(/The file type you uploaded is not supported/);
      (0, _chai.expect)((0, _testHelpers.findAll)('.gh-btn-green').length, 'reset button is displayed').to.equal(1);
      (0, _chai.expect)((0, _testHelpers.find)('.gh-btn-green').textContent).to.equal('Try Again');
    });
    (0, _mocha.it)('displays file too large for server error', async function () {
      stubFailedUpload(server, 413, 'RequestEntityTooLargeError');
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-file-uploader url=uploadUrl}}
      */
      {
        "id": "u+hL5Tfp",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,1],null,[[\"url\"],[[35,0]]]]]],\"hasEval\":false,\"upvars\":[\"uploadUrl\",\"gh-file-uploader\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.csv'
      });
      (0, _chai.expect)((0, _testHelpers.findAll)('.failed').length, 'error message is displayed').to.equal(1);
      (0, _chai.expect)((0, _testHelpers.find)('.failed').textContent).to.match(/The file you uploaded was larger/);
    });
    (0, _mocha.it)('handles file too large error directly from the web server', async function () {
      server.post(`${(0, _ghostPaths.default)().apiRoot}/images/`, function () {
        return [413, {}, ''];
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-file-uploader url=uploadUrl}}
      */
      {
        "id": "u+hL5Tfp",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,1],null,[[\"url\"],[[35,0]]]]]],\"hasEval\":false,\"upvars\":[\"uploadUrl\",\"gh-file-uploader\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.csv'
      });
      (0, _chai.expect)((0, _testHelpers.findAll)('.failed').length, 'error message is displayed').to.equal(1);
      (0, _chai.expect)((0, _testHelpers.find)('.failed').textContent).to.match(/The file you uploaded was larger/);
    });
    (0, _mocha.it)('displays other server-side error with message', async function () {
      stubFailedUpload(server, 400, 'UnknownError');
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-file-uploader url=uploadUrl}}
      */
      {
        "id": "u+hL5Tfp",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,1],null,[[\"url\"],[[35,0]]]]]],\"hasEval\":false,\"upvars\":[\"uploadUrl\",\"gh-file-uploader\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.csv'
      });
      (0, _chai.expect)((0, _testHelpers.findAll)('.failed').length, 'error message is displayed').to.equal(1);
      (0, _chai.expect)((0, _testHelpers.find)('.failed').textContent).to.match(/Error: UnknownError/);
    });
    (0, _mocha.it)('handles unknown failure', async function () {
      server.post(`${(0, _ghostPaths.default)().apiRoot}/images/`, function () {
        return [500, {
          'Content-Type': 'application/json'
        }, ''];
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-file-uploader url=uploadUrl}}
      */
      {
        "id": "u+hL5Tfp",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,1],null,[[\"url\"],[[35,0]]]]]],\"hasEval\":false,\"upvars\":[\"uploadUrl\",\"gh-file-uploader\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.csv'
      });
      (0, _chai.expect)((0, _testHelpers.findAll)('.failed').length, 'error message is displayed').to.equal(1);
      (0, _chai.expect)((0, _testHelpers.find)('.failed').textContent).to.match(/Something went wrong/);
    });
    (0, _mocha.it)('triggers notifications.showAPIError for VersionMismatchError', async function () {
      let showAPIError = _sinon.default.spy();

      let notifications = this.owner.lookup('service:notifications');
      notifications.set('showAPIError', showAPIError);
      stubFailedUpload(server, 400, 'VersionMismatchError');
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-file-uploader url=uploadUrl}}
      */
      {
        "id": "u+hL5Tfp",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,1],null,[[\"url\"],[[35,0]]]]]],\"hasEval\":false,\"upvars\":[\"uploadUrl\",\"gh-file-uploader\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.csv'
      });
      (0, _chai.expect)(showAPIError.calledOnce).to.be.true;
    });
    (0, _mocha.it)('doesn\'t trigger notifications.showAPIError for other errors', async function () {
      let showAPIError = _sinon.default.spy();

      let notifications = this.owner.lookup('service:notifications');
      notifications.set('showAPIError', showAPIError);
      stubFailedUpload(server, 400, 'UnknownError');
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-file-uploader url=uploadUrl}}
      */
      {
        "id": "u+hL5Tfp",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,1],null,[[\"url\"],[[35,0]]]]]],\"hasEval\":false,\"upvars\":[\"uploadUrl\",\"gh-file-uploader\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.csv'
      });
      (0, _chai.expect)(showAPIError.called).to.be.false;
    });
    (0, _mocha.it)('can be reset after a failed upload', async function () {
      stubFailedUpload(server, 400, 'UnknownError');
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-file-uploader url=uploadUrl}}
      */
      {
        "id": "u+hL5Tfp",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,1],null,[[\"url\"],[[35,0]]]]]],\"hasEval\":false,\"upvars\":[\"uploadUrl\",\"gh-file-uploader\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.csv'
      });
      await (0, _testHelpers.click)('.gh-btn-green');
      (0, _chai.expect)((0, _testHelpers.findAll)('input[type="file"]').length).to.equal(1);
    });
    (0, _mocha.it)('handles drag over/leave', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-file-uploader}}
      */
      {
        "id": "DVe0RFn2",
        "block": "{\"symbols\":[],\"statements\":[[1,[34,0]]],\"hasEval\":false,\"upvars\":[\"gh-file-uploader\"]}",
        "moduleName": "(unknown template module)"
      }));
      Ember.run(() => {
        // eslint-disable-next-line new-cap
        let dragover = _jquery.default.Event('dragover', {
          dataTransfer: {
            files: []
          }
        });

        (0, _jquery.default)((0, _testHelpers.find)('.gh-image-uploader')).trigger(dragover);
      });
      await (0, _testHelpers.settled)();
      (0, _chai.expect)((0, _testHelpers.find)('.gh-image-uploader').classList.contains('-drag-over'), 'has drag-over class').to.be.true;
      await (0, _testHelpers.triggerEvent)('.gh-image-uploader', 'dragleave');
      (0, _chai.expect)((0, _testHelpers.find)('.gh-image-uploader').classList.contains('-drag-over'), 'has drag-over class').to.be.false;
    });
    (0, _mocha.it)('triggers file upload on file drop', async function () {
      let uploadSuccess = _sinon.default.spy(); // eslint-disable-next-line new-cap


      let drop = _jquery.default.Event('drop', {
        dataTransfer: {
          files: [(0, _fileUpload.createFile)(['test'], {
            name: 'test.csv'
          })]
        }
      });

      this.set('uploadSuccess', uploadSuccess);
      stubSuccessfulUpload(server);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-file-uploader url=uploadUrl uploadSuccess=(action uploadSuccess)}}
      */
      {
        "id": "bBuqHDDe",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,3],null,[[\"url\",\"uploadSuccess\"],[[35,2],[30,[36,1],[[32,0],[35,0]],null]]]]]],\"hasEval\":false,\"upvars\":[\"uploadSuccess\",\"action\",\"uploadUrl\",\"gh-file-uploader\"]}",
        "moduleName": "(unknown template module)"
      }));
      Ember.run(() => {
        (0, _jquery.default)((0, _testHelpers.find)('.gh-image-uploader')).trigger(drop);
      });
      await (0, _testHelpers.settled)();
      (0, _chai.expect)(uploadSuccess.calledOnce).to.be.true;
      (0, _chai.expect)(uploadSuccess.firstCall.args[0]).to.eql({
        url: '/content/images/test.png'
      });
    });
    (0, _mocha.it)('validates extension by default', async function () {
      let uploadSuccess = _sinon.default.spy();

      let uploadFailed = _sinon.default.spy();

      this.set('uploadSuccess', uploadSuccess);
      this.set('uploadFailed', uploadFailed);
      stubSuccessfulUpload(server);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-file-uploader
                  url=uploadUrl
                  uploadSuccess=(action uploadSuccess)
                  uploadFailed=(action uploadFailed)}}
      */
      {
        "id": "iOBlg1bY",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,4],null,[[\"url\",\"uploadSuccess\",\"uploadFailed\"],[[35,3],[30,[36,1],[[32,0],[35,2]],null],[30,[36,1],[[32,0],[35,0]],null]]]]]],\"hasEval\":false,\"upvars\":[\"uploadFailed\",\"action\",\"uploadSuccess\",\"uploadUrl\",\"gh-file-uploader\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.txt'
      });
      (0, _chai.expect)(uploadSuccess.called).to.be.false;
      (0, _chai.expect)(uploadFailed.calledOnce).to.be.true;
      (0, _chai.expect)((0, _testHelpers.findAll)('.failed').length, 'error message is displayed').to.equal(1);
      (0, _chai.expect)((0, _testHelpers.find)('.failed').textContent).to.match(/The file type you uploaded is not supported/);
    });
    (0, _mocha.it)('uploads if validate action supplied and returns true', async function () {
      let validate = _sinon.default.stub().returns(true);

      let uploadSuccess = _sinon.default.spy();

      this.set('validate', validate);
      this.set('uploadSuccess', uploadSuccess);
      stubSuccessfulUpload(server);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-file-uploader
                  url=uploadUrl
                  uploadSuccess=(action uploadSuccess)
                  validate=(action validate)}}
      */
      {
        "id": "NioFQAFL",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,4],null,[[\"url\",\"uploadSuccess\",\"validate\"],[[35,3],[30,[36,1],[[32,0],[35,2]],null],[30,[36,1],[[32,0],[35,0]],null]]]]]],\"hasEval\":false,\"upvars\":[\"validate\",\"action\",\"uploadSuccess\",\"uploadUrl\",\"gh-file-uploader\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.csv'
      });
      await (0, _testHelpers.settled)();
      (0, _chai.expect)(validate.calledOnce).to.be.true;
      (0, _chai.expect)(uploadSuccess.calledOnce).to.be.true;
    });
    (0, _mocha.it)('skips upload and displays error if validate action supplied and doesn\'t return true', async function () {
      let validate = _sinon.default.stub().returns(new _ajax.UnsupportedMediaTypeError());

      let uploadSuccess = _sinon.default.spy();

      let uploadFailed = _sinon.default.spy();

      this.set('validate', validate);
      this.set('uploadSuccess', uploadSuccess);
      this.set('uploadFailed', uploadFailed);
      stubSuccessfulUpload(server);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-file-uploader
                  url=uploadUrl
                  uploadSuccess=(action uploadSuccess)
                  uploadFailed=(action uploadFailed)
                  validate=(action validate)}}
      */
      {
        "id": "IFlBdpb+",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,5],null,[[\"url\",\"uploadSuccess\",\"uploadFailed\",\"validate\"],[[35,4],[30,[36,1],[[32,0],[35,3]],null],[30,[36,1],[[32,0],[35,2]],null],[30,[36,1],[[32,0],[35,0]],null]]]]]],\"hasEval\":false,\"upvars\":[\"validate\",\"action\",\"uploadFailed\",\"uploadSuccess\",\"uploadUrl\",\"gh-file-uploader\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.csv'
      });
      (0, _chai.expect)(validate.calledOnce).to.be.true;
      (0, _chai.expect)(uploadSuccess.called).to.be.false;
      (0, _chai.expect)(uploadFailed.calledOnce).to.be.true;
      (0, _chai.expect)((0, _testHelpers.findAll)('.failed').length, 'error message is displayed').to.equal(1);
      (0, _chai.expect)((0, _testHelpers.find)('.failed').textContent).to.match(/The file type you uploaded is not supported/);
    });
  });
});
define("ghost-admin/tests/integration/components/gh-image-uploader-test", ["jquery", "pretender", "ghost-admin/utils/ghost-paths", "sinon", "ghost-admin/services/ajax", "@ember/test-helpers", "ghost-admin/tests/helpers/file-upload", "mocha", "chai", "ember-mocha"], function (_jquery, _pretender, _ghostPaths, _sinon, _ajax, _testHelpers, _fileUpload, _mocha, _chai, _emberMocha) {
  "use strict";

  const notificationsStub = Ember.Service.extend({
    showAPIError() {// noop - to be stubbed
    }

  });
  const sessionStub = Ember.Service.extend({
    isAuthenticated: false,

    init() {
      this._super(...arguments);

      let authenticated = {
        access_token: 'AccessMe123'
      };
      this.authenticated = authenticated;
      this.data = {
        authenticated
      };
    }

  });

  const stubSuccessfulUpload = function (server) {
    let delay = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
    server.post(`${(0, _ghostPaths.default)().apiRoot}/images/upload/`, function () {
      return [200, {
        'Content-Type': 'application/json'
      }, '{"images": [{"url":"/content/images/test.png"}]}'];
    }, delay);
  };

  const stubFailedUpload = function (server, code, error) {
    let delay = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;
    server.post(`${(0, _ghostPaths.default)().apiRoot}/images/upload/`, function () {
      return [code, {
        'Content-Type': 'application/json'
      }, JSON.stringify({
        errors: [{
          type: error,
          message: `Error: ${error}`
        }]
      })];
    }, delay);
  };

  (0, _mocha.describe)('Integration: Component: gh-image-uploader', function () {
    (0, _emberMocha.setupRenderingTest)();
    let server;
    beforeEach(function () {
      this.owner.register('service:session', sessionStub);
      this.owner.register('service:notifications', notificationsStub);
      this.set('update', function () {});
      server = new _pretender.default();
    });
    afterEach(function () {
      server.shutdown();
    });
    (0, _mocha.it)('renders form with supplied alt text', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-image-uploader image=image altText="text test"}}
      */
      {
        "id": "86KhIoeq",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,1],null,[[\"image\",\"altText\"],[[35,0],\"text test\"]]]]],\"hasEval\":false,\"upvars\":[\"image\",\"gh-image-uploader\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-file-input-description]')).to.have.trimmed.text('Upload image of "text test"');
    });
    (0, _mocha.it)('renders form with supplied text', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-image-uploader image=image text="text test"}}
      */
      {
        "id": "SexQBUib",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,1],null,[[\"image\",\"text\"],[[35,0],\"text test\"]]]]],\"hasEval\":false,\"upvars\":[\"image\",\"gh-image-uploader\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-file-input-description]')).to.have.trimmed.text('text test');
    });
    (0, _mocha.it)('generates request to correct endpoint', async function () {
      stubSuccessfulUpload(server);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-image-uploader image=image update=(action update)}}
      */
      {
        "id": "lK+8df00",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,3],null,[[\"image\",\"update\"],[[35,2],[30,[36,1],[[32,0],[35,0]],null]]]]]],\"hasEval\":false,\"upvars\":[\"update\",\"action\",\"image\",\"gh-image-uploader\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.png'
      });
      (0, _chai.expect)(server.handledRequests.length).to.equal(1);
      (0, _chai.expect)(server.handledRequests[0].url).to.equal(`${(0, _ghostPaths.default)().apiRoot}/images/upload/`);
      (0, _chai.expect)(server.handledRequests[0].requestHeaders.Authorization).to.be.undefined;
    });
    (0, _mocha.it)('fires update action on successful upload', async function () {
      let update = _sinon.default.spy();

      this.set('update', update);
      stubSuccessfulUpload(server);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-image-uploader image=image update=(action update)}}
      */
      {
        "id": "lK+8df00",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,3],null,[[\"image\",\"update\"],[[35,2],[30,[36,1],[[32,0],[35,0]],null]]]]]],\"hasEval\":false,\"upvars\":[\"update\",\"action\",\"image\",\"gh-image-uploader\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.png'
      });
      (0, _chai.expect)(update.calledOnce).to.be.true;
      (0, _chai.expect)(update.firstCall.args[0]).to.equal('/content/images/test.png');
    });
    (0, _mocha.it)('doesn\'t fire update action on failed upload', async function () {
      let update = _sinon.default.spy();

      this.set('update', update);
      stubFailedUpload(server, 500);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-image-uploader image=image update=(action update)}}
      */
      {
        "id": "lK+8df00",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,3],null,[[\"image\",\"update\"],[[35,2],[30,[36,1],[[32,0],[35,0]],null]]]]]],\"hasEval\":false,\"upvars\":[\"update\",\"action\",\"image\",\"gh-image-uploader\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.png'
      });
      (0, _chai.expect)(update.calledOnce).to.be.false;
    });
    (0, _mocha.it)('fires fileSelected action on file selection', async function () {
      let fileSelected = _sinon.default.spy();

      this.set('fileSelected', fileSelected);
      stubSuccessfulUpload(server);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-image-uploader image=image fileSelected=(action fileSelected) update=(action update)}}
      */
      {
        "id": "IMo//Qb3",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,4],null,[[\"image\",\"fileSelected\",\"update\"],[[35,3],[30,[36,1],[[32,0],[35,2]],null],[30,[36,1],[[32,0],[35,0]],null]]]]]],\"hasEval\":false,\"upvars\":[\"update\",\"action\",\"fileSelected\",\"image\",\"gh-image-uploader\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.png'
      });
      (0, _chai.expect)(fileSelected.calledOnce).to.be.true;
      (0, _chai.expect)(fileSelected.args[0]).to.not.be.empty;
    });
    (0, _mocha.it)('fires uploadStarted action on upload start', async function () {
      let uploadStarted = _sinon.default.spy();

      this.set('uploadStarted', uploadStarted);
      stubSuccessfulUpload(server);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-image-uploader image=image uploadStarted=(action uploadStarted) update=(action update)}}
      */
      {
        "id": "46E0nHOY",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,4],null,[[\"image\",\"uploadStarted\",\"update\"],[[35,3],[30,[36,1],[[32,0],[35,2]],null],[30,[36,1],[[32,0],[35,0]],null]]]]]],\"hasEval\":false,\"upvars\":[\"update\",\"action\",\"uploadStarted\",\"image\",\"gh-image-uploader\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.png'
      });
      (0, _chai.expect)(uploadStarted.calledOnce).to.be.true;
    });
    (0, _mocha.it)('fires uploadFinished action on successful upload', async function () {
      let uploadFinished = _sinon.default.spy();

      this.set('uploadFinished', uploadFinished);
      stubSuccessfulUpload(server);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-image-uploader image=image uploadFinished=(action uploadFinished) update=(action update)}}
      */
      {
        "id": "xYgz3LYF",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,4],null,[[\"image\",\"uploadFinished\",\"update\"],[[35,3],[30,[36,1],[[32,0],[35,2]],null],[30,[36,1],[[32,0],[35,0]],null]]]]]],\"hasEval\":false,\"upvars\":[\"update\",\"action\",\"uploadFinished\",\"image\",\"gh-image-uploader\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.png'
      });
      (0, _chai.expect)(uploadFinished.calledOnce).to.be.true;
    });
    (0, _mocha.it)('fires uploadFinished action on failed upload', async function () {
      let uploadFinished = _sinon.default.spy();

      this.set('uploadFinished', uploadFinished);
      stubFailedUpload(server);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-image-uploader image=image uploadFinished=(action uploadFinished) update=(action update)}}
      */
      {
        "id": "xYgz3LYF",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,4],null,[[\"image\",\"uploadFinished\",\"update\"],[[35,3],[30,[36,1],[[32,0],[35,2]],null],[30,[36,1],[[32,0],[35,0]],null]]]]]],\"hasEval\":false,\"upvars\":[\"update\",\"action\",\"uploadFinished\",\"image\",\"gh-image-uploader\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.png'
      });
      (0, _chai.expect)(uploadFinished.calledOnce).to.be.true;
    });
    (0, _mocha.it)('displays invalid file type error', async function () {
      stubFailedUpload(server, 415, 'UnsupportedMediaTypeError');
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-image-uploader image=image update=(action update)}}
      */
      {
        "id": "lK+8df00",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,3],null,[[\"image\",\"update\"],[[35,2],[30,[36,1],[[32,0],[35,0]],null]]]]]],\"hasEval\":false,\"upvars\":[\"update\",\"action\",\"image\",\"gh-image-uploader\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.png'
      });
      (0, _chai.expect)((0, _testHelpers.findAll)('.failed').length, 'error message is displayed').to.equal(1);
      (0, _chai.expect)((0, _testHelpers.find)('.failed').textContent).to.match(/The image type you uploaded is not supported/);
      (0, _chai.expect)((0, _testHelpers.findAll)('.gh-btn-green').length, 'reset button is displayed').to.equal(1);
      (0, _chai.expect)((0, _testHelpers.find)('.gh-btn-green').textContent).to.equal('Try Again');
    });
    (0, _mocha.it)('displays file too large for server error', async function () {
      stubFailedUpload(server, 413, 'RequestEntityTooLargeError');
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-image-uploader image=image update=(action update)}}
      */
      {
        "id": "lK+8df00",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,3],null,[[\"image\",\"update\"],[[35,2],[30,[36,1],[[32,0],[35,0]],null]]]]]],\"hasEval\":false,\"upvars\":[\"update\",\"action\",\"image\",\"gh-image-uploader\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.png'
      });
      (0, _chai.expect)((0, _testHelpers.findAll)('.failed').length, 'error message is displayed').to.equal(1);
      (0, _chai.expect)((0, _testHelpers.find)('.failed').textContent).to.match(/The image you uploaded was larger/);
    });
    (0, _mocha.it)('handles file too large error directly from the web server', async function () {
      server.post(`${(0, _ghostPaths.default)().apiRoot}/images/upload/`, function () {
        return [413, {}, ''];
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-image-uploader image=image update=(action update)}}
      */
      {
        "id": "lK+8df00",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,3],null,[[\"image\",\"update\"],[[35,2],[30,[36,1],[[32,0],[35,0]],null]]]]]],\"hasEval\":false,\"upvars\":[\"update\",\"action\",\"image\",\"gh-image-uploader\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.png'
      });
      (0, _chai.expect)((0, _testHelpers.findAll)('.failed').length, 'error message is displayed').to.equal(1);
      (0, _chai.expect)((0, _testHelpers.find)('.failed').textContent).to.match(/The image you uploaded was larger/);
    });
    (0, _mocha.it)('displays other server-side error with message', async function () {
      stubFailedUpload(server, 400, 'UnknownError');
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-image-uploader image=image update=(action update)}}
      */
      {
        "id": "lK+8df00",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,3],null,[[\"image\",\"update\"],[[35,2],[30,[36,1],[[32,0],[35,0]],null]]]]]],\"hasEval\":false,\"upvars\":[\"update\",\"action\",\"image\",\"gh-image-uploader\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.png'
      });
      (0, _chai.expect)((0, _testHelpers.findAll)('.failed').length, 'error message is displayed').to.equal(1);
      (0, _chai.expect)((0, _testHelpers.find)('.failed').textContent).to.match(/Error: UnknownError/);
    });
    (0, _mocha.it)('handles unknown failure', async function () {
      server.post(`${(0, _ghostPaths.default)().apiRoot}/images/upload/`, function () {
        return [500, {
          'Content-Type': 'application/json'
        }, ''];
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-image-uploader image=image update=(action update)}}
      */
      {
        "id": "lK+8df00",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,3],null,[[\"image\",\"update\"],[[35,2],[30,[36,1],[[32,0],[35,0]],null]]]]]],\"hasEval\":false,\"upvars\":[\"update\",\"action\",\"image\",\"gh-image-uploader\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.png'
      });
      (0, _chai.expect)((0, _testHelpers.findAll)('.failed').length, 'error message is displayed').to.equal(1);
      (0, _chai.expect)((0, _testHelpers.find)('.failed').textContent).to.match(/Something went wrong/);
    });
    (0, _mocha.it)('triggers notifications.showAPIError for VersionMismatchError', async function () {
      let showAPIError = _sinon.default.spy();

      let notifications = this.owner.lookup('service:notifications');
      notifications.set('showAPIError', showAPIError);
      stubFailedUpload(server, 400, 'VersionMismatchError');
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-image-uploader image=image update=(action update)}}
      */
      {
        "id": "lK+8df00",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,3],null,[[\"image\",\"update\"],[[35,2],[30,[36,1],[[32,0],[35,0]],null]]]]]],\"hasEval\":false,\"upvars\":[\"update\",\"action\",\"image\",\"gh-image-uploader\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.png'
      });
      (0, _chai.expect)(showAPIError.calledOnce).to.be.true;
    });
    (0, _mocha.it)('doesn\'t trigger notifications.showAPIError for other errors', async function () {
      let showAPIError = _sinon.default.spy();

      let notifications = this.owner.lookup('service:notifications');
      notifications.set('showAPIError', showAPIError);
      stubFailedUpload(server, 400, 'UnknownError');
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-image-uploader image=image update=(action update)}}
      */
      {
        "id": "lK+8df00",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,3],null,[[\"image\",\"update\"],[[35,2],[30,[36,1],[[32,0],[35,0]],null]]]]]],\"hasEval\":false,\"upvars\":[\"update\",\"action\",\"image\",\"gh-image-uploader\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.png'
      });
      (0, _chai.expect)(showAPIError.called).to.be.false;
    });
    (0, _mocha.it)('can be reset after a failed upload', async function () {
      stubFailedUpload(server, 400, 'UnknownError');
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-image-uploader image=image update=(action update)}}
      */
      {
        "id": "lK+8df00",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,3],null,[[\"image\",\"update\"],[[35,2],[30,[36,1],[[32,0],[35,0]],null]]]]]],\"hasEval\":false,\"upvars\":[\"update\",\"action\",\"image\",\"gh-image-uploader\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        type: 'test.png'
      });
      await (0, _testHelpers.click)('.gh-btn-green');
      (0, _chai.expect)((0, _testHelpers.findAll)('input[type="file"]').length).to.equal(1);
    });
    (0, _mocha.it)('handles drag over/leave', async function () {
      stubSuccessfulUpload(server);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-image-uploader image=image update=(action update)}}
      */
      {
        "id": "lK+8df00",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,3],null,[[\"image\",\"update\"],[[35,2],[30,[36,1],[[32,0],[35,0]],null]]]]]],\"hasEval\":false,\"upvars\":[\"update\",\"action\",\"image\",\"gh-image-uploader\"]}",
        "moduleName": "(unknown template module)"
      }));
      Ember.run(() => {
        // eslint-disable-next-line new-cap
        let dragover = _jquery.default.Event('dragover', {
          dataTransfer: {
            files: []
          }
        });

        (0, _jquery.default)((0, _testHelpers.find)('.gh-image-uploader')).trigger(dragover);
      });
      await (0, _testHelpers.settled)();
      (0, _chai.expect)((0, _testHelpers.find)('.gh-image-uploader').classList.contains('-drag-over'), 'has drag-over class').to.be.true;
      await (0, _testHelpers.triggerEvent)('.gh-image-uploader', 'dragleave');
      (0, _chai.expect)((0, _testHelpers.find)('.gh-image-uploader').classList.contains('-drag-over'), 'has drag-over class').to.be.false;
    });
    (0, _mocha.it)('triggers file upload on file drop', async function () {
      let uploadSuccess = _sinon.default.spy(); // eslint-disable-next-line new-cap


      let drop = _jquery.default.Event('drop', {
        dataTransfer: {
          files: [(0, _fileUpload.createFile)(['test'], {
            name: 'test.png'
          })]
        }
      });

      this.set('uploadSuccess', uploadSuccess);
      stubSuccessfulUpload(server);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-image-uploader uploadSuccess=(action uploadSuccess)}}
      */
      {
        "id": "FYP8tqCx",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,2],null,[[\"uploadSuccess\"],[[30,[36,1],[[32,0],[35,0]],null]]]]]],\"hasEval\":false,\"upvars\":[\"uploadSuccess\",\"action\",\"gh-image-uploader\"]}",
        "moduleName": "(unknown template module)"
      }));
      Ember.run(() => {
        (0, _jquery.default)((0, _testHelpers.find)('.gh-image-uploader')).trigger(drop);
      });
      await (0, _testHelpers.settled)();
      (0, _chai.expect)(uploadSuccess.calledOnce).to.be.true;
      (0, _chai.expect)(uploadSuccess.firstCall.args[0]).to.equal('/content/images/test.png');
    });
    (0, _mocha.it)('validates extension by default', async function () {
      let uploadSuccess = _sinon.default.spy();

      let uploadFailed = _sinon.default.spy();

      this.set('uploadSuccess', uploadSuccess);
      this.set('uploadFailed', uploadFailed);
      stubSuccessfulUpload(server);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-image-uploader
                  uploadSuccess=(action uploadSuccess)
                  uploadFailed=(action uploadFailed)}}
      */
      {
        "id": "xxRJoZLK",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,3],null,[[\"uploadSuccess\",\"uploadFailed\"],[[30,[36,1],[[32,0],[35,2]],null],[30,[36,1],[[32,0],[35,0]],null]]]]]],\"hasEval\":false,\"upvars\":[\"uploadFailed\",\"action\",\"uploadSuccess\",\"gh-image-uploader\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.json'
      });
      (0, _chai.expect)(uploadSuccess.called).to.be.false;
      (0, _chai.expect)(uploadFailed.calledOnce).to.be.true;
      (0, _chai.expect)((0, _testHelpers.findAll)('.failed').length, 'error message is displayed').to.equal(1);
      (0, _chai.expect)((0, _testHelpers.find)('.failed').textContent).to.match(/The image type you uploaded is not supported/);
    });
    (0, _mocha.it)('uploads if validate action supplied and returns true', async function () {
      let validate = _sinon.default.stub().returns(true);

      let uploadSuccess = _sinon.default.spy();

      this.set('validate', validate);
      this.set('uploadSuccess', uploadSuccess);
      stubSuccessfulUpload(server);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-image-uploader
                  uploadSuccess=(action uploadSuccess)
                  validate=(action validate)}}
      */
      {
        "id": "sXtzf47J",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,3],null,[[\"uploadSuccess\",\"validate\"],[[30,[36,1],[[32,0],[35,2]],null],[30,[36,1],[[32,0],[35,0]],null]]]]]],\"hasEval\":false,\"upvars\":[\"validate\",\"action\",\"uploadSuccess\",\"gh-image-uploader\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.txt'
      });
      (0, _chai.expect)(validate.calledOnce).to.be.true;
      (0, _chai.expect)(uploadSuccess.calledOnce).to.be.true;
    });
    (0, _mocha.it)('skips upload and displays error if validate action supplied and doesn\'t return true', async function () {
      let validate = _sinon.default.stub().returns(new _ajax.UnsupportedMediaTypeError());

      let uploadSuccess = _sinon.default.spy();

      let uploadFailed = _sinon.default.spy();

      this.set('validate', validate);
      this.set('uploadSuccess', uploadSuccess);
      this.set('uploadFailed', uploadFailed);
      stubSuccessfulUpload(server);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-image-uploader
                  uploadSuccess=(action uploadSuccess)
                  uploadFailed=(action uploadFailed)
                  validate=(action validate)}}
      */
      {
        "id": "aZA2Uyl0",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,4],null,[[\"uploadSuccess\",\"uploadFailed\",\"validate\"],[[30,[36,1],[[32,0],[35,3]],null],[30,[36,1],[[32,0],[35,2]],null],[30,[36,1],[[32,0],[35,0]],null]]]]]],\"hasEval\":false,\"upvars\":[\"validate\",\"action\",\"uploadFailed\",\"uploadSuccess\",\"gh-image-uploader\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['test'], {
        name: 'test.png'
      });
      (0, _chai.expect)(validate.calledOnce).to.be.true;
      (0, _chai.expect)(uploadSuccess.called).to.be.false;
      (0, _chai.expect)(uploadFailed.calledOnce).to.be.true;
      (0, _chai.expect)((0, _testHelpers.findAll)('.failed').length, 'error message is displayed').to.equal(1);
      (0, _chai.expect)((0, _testHelpers.find)('.failed').textContent).to.match(/The image type you uploaded is not supported/);
    });
    (0, _mocha.describe)('unsplash', function () {
      (0, _mocha.it)('has unsplash icon only when unsplash is active & allowed');
      (0, _mocha.it)('opens unsplash modal when icon clicked');
      (0, _mocha.it)('inserts unsplash image when selected');
      (0, _mocha.it)('closes unsplash modal when close is triggered');
    });
  });
});
define("ghost-admin/tests/integration/components/gh-image-uploader-with-preview-test", ["sinon", "@ember/test-helpers", "mocha", "chai", "ember-mocha"], function (_sinon, _testHelpers, _mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Integration: Component: gh-image-uploader-with-preview', function () {
    (0, _emberMocha.setupRenderingTest)();
    (0, _mocha.it)('renders image if provided', async function () {
      let remove = _sinon.default.spy();

      this.set('remove', remove);
      this.set('image', 'http://example.com/test.png');
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-image-uploader-with-preview image=image remove=(action remove)}}
      */
      {
        "id": "77RiuC5x",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,3],null,[[\"image\",\"remove\"],[[35,2],[30,[36,1],[[32,0],[35,0]],null]]]]]],\"hasEval\":false,\"upvars\":[\"remove\",\"action\",\"image\",\"gh-image-uploader-with-preview\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.findAll)('.gh-image-uploader.-with-image').length).to.equal(1);
      (0, _chai.expect)((0, _testHelpers.find)('img').getAttribute('src')).to.equal('http://example.com/test.png');
    });
    (0, _mocha.it)('renders upload form when no image provided', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-image-uploader-with-preview image=image}}
      */
      {
        "id": "5i2Rw1nc",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,1],null,[[\"image\"],[[35,0]]]]]],\"hasEval\":false,\"upvars\":[\"image\",\"gh-image-uploader-with-preview\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.findAll)('input[type="file"]').length).to.equal(1);
    });
    (0, _mocha.it)('triggers remove action when delete icon is clicked', async function () {
      let remove = _sinon.default.spy();

      this.set('remove', remove);
      this.set('image', 'http://example.com/test.png');
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-image-uploader-with-preview image=image remove=(action remove)}}
      */
      {
        "id": "77RiuC5x",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,3],null,[[\"image\",\"remove\"],[[35,2],[30,[36,1],[[32,0],[35,0]],null]]]]]],\"hasEval\":false,\"upvars\":[\"remove\",\"action\",\"image\",\"gh-image-uploader-with-preview\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _testHelpers.click)('.image-delete');
      (0, _chai.expect)(remove.calledOnce).to.be.true;
    });
  });
});
define("ghost-admin/tests/integration/components/gh-member-avatar-test", ["mocha", "chai", "@ember/test-helpers", "ember-mocha"], function (_mocha, _chai, _testHelpers, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Integration: Component: gh-member-avatar', function () {
    (0, _emberMocha.setupRenderingTest)();
    (0, _mocha.it)('renders', async function () {
      this.set('member', {
        get(key) {
          if (key === 'name') {
            return 'Homer Simpson';
          }
        }

      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhMemberAvatar @member={{member}} />
      */
      {
        "id": "27wIMegC",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-member-avatar\",[],[[\"@member\"],[[34,0]]],null]],\"hasEval\":false,\"upvars\":[\"member\"]}",
        "moduleName": "(unknown template module)"
      }));
      let avatar = this.element;
      (0, _chai.expect)(avatar).to.exist;
    });
  });
});
define("ghost-admin/tests/integration/components/gh-members-import-table-test", ["@ember/test-helpers", "mocha", "chai", "ember-mocha"], function (_testHelpers, _mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Integration: Component: gh-members-import-table', function () {
    (0, _emberMocha.setupRenderingTest)();
    (0, _mocha.it)('renders members data with all the properties', async function () {
      this.set('importData', [{
        name: 'Kevin',
        email: 'kevin@example.com'
      }]);
      this.set('setMapping', () => {});
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        
                  <GhMembersImportTable @data={{this.importData}} @setMapping={{this.setMapping}}/>
              
      */
      {
        "id": "V9LhZ2F4",
        "block": "{\"symbols\":[],\"statements\":[[2,\"\\n            \"],[8,\"gh-members-import-table\",[],[[\"@data\",\"@setMapping\"],[[32,0,[\"importData\"]],[32,0,[\"setMapping\"]]]],null],[2,\"\\n        \"]],\"hasEval\":false,\"upvars\":[]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.findAll)('table tbody tr').length).to.equal(2);
      (0, _chai.expect)((0, _testHelpers.findAll)('table tbody tr td')[0].textContent).to.equal('name');
      (0, _chai.expect)((0, _testHelpers.findAll)('table tbody tr td')[1].textContent).to.equal('Kevin');
      (0, _chai.expect)((0, _testHelpers.findAll)('table tbody tr td')[2].textContent).to.match(/Not imported/);
      (0, _chai.expect)((0, _testHelpers.findAll)('table tbody tr td')[3].textContent).to.equal('email');
      (0, _chai.expect)((0, _testHelpers.findAll)('table tbody tr td')[4].textContent).to.equal('kevin@example.com');
      (0, _chai.expect)((0, _testHelpers.findAll)('table tbody tr td')[5].textContent).to.match(/Not imported/);
    });
    (0, _mocha.it)('navigates through data when next and previous are clicked', async function () {
      this.set('importData', [{
        name: 'Kevin',
        email: 'kevin@example.com'
      }, {
        name: 'Rish',
        email: 'rish@example.com'
      }]);
      this.set('setMapping', () => {});
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        
                  <GhMembersImportTable @data={{this.importData}} @setMapping={{this.setMapping}}/>
              
      */
      {
        "id": "V9LhZ2F4",
        "block": "{\"symbols\":[],\"statements\":[[2,\"\\n            \"],[8,\"gh-members-import-table\",[],[[\"@data\",\"@setMapping\"],[[32,0,[\"importData\"]],[32,0,[\"setMapping\"]]]],null],[2,\"\\n        \"]],\"hasEval\":false,\"upvars\":[]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.findAll)('table tbody tr').length).to.equal(2);
      (0, _chai.expect)((0, _testHelpers.findAll)('table tbody tr td')[0].textContent).to.equal('name');
      (0, _chai.expect)((0, _testHelpers.findAll)('table tbody tr td')[1].textContent).to.equal('Kevin');
      (0, _chai.expect)((0, _testHelpers.findAll)('table tbody tr td')[2].textContent).to.match(/Not imported/);
      (0, _chai.expect)((0, _testHelpers.findAll)('table tbody tr td')[3].textContent).to.equal('email');
      (0, _chai.expect)((0, _testHelpers.findAll)('table tbody tr td')[4].textContent).to.equal('kevin@example.com');
      (0, _chai.expect)((0, _testHelpers.findAll)('table tbody tr td')[5].textContent).to.match(/Not imported/);
      await (0, _testHelpers.click)('[data-test-import-next]');
      (0, _chai.expect)((0, _testHelpers.findAll)('table tbody tr').length).to.equal(2);
      (0, _chai.expect)((0, _testHelpers.findAll)('table tbody tr td')[0].textContent).to.equal('name');
      (0, _chai.expect)((0, _testHelpers.findAll)('table tbody tr td')[1].textContent).to.equal('Rish');
      (0, _chai.expect)((0, _testHelpers.findAll)('table tbody tr td')[2].textContent).to.match(/Not imported/);
      (0, _chai.expect)((0, _testHelpers.findAll)('table tbody tr td')[3].textContent).to.equal('email');
      (0, _chai.expect)((0, _testHelpers.findAll)('table tbody tr td')[4].textContent).to.equal('rish@example.com');
      (0, _chai.expect)((0, _testHelpers.findAll)('table tbody tr td')[5].textContent).to.match(/Not imported/);
      await (0, _testHelpers.click)('[data-test-import-prev]');
      (0, _chai.expect)((0, _testHelpers.findAll)('table tbody tr').length).to.equal(2);
      (0, _chai.expect)((0, _testHelpers.findAll)('table tbody tr td')[0].textContent).to.equal('name');
      (0, _chai.expect)((0, _testHelpers.findAll)('table tbody tr td')[1].textContent).to.equal('Kevin');
      (0, _chai.expect)((0, _testHelpers.findAll)('table tbody tr td')[2].textContent).to.match(/Not imported/);
      (0, _chai.expect)((0, _testHelpers.findAll)('table tbody tr td')[3].textContent).to.equal('email');
      (0, _chai.expect)((0, _testHelpers.findAll)('table tbody tr td')[4].textContent).to.equal('kevin@example.com');
      (0, _chai.expect)((0, _testHelpers.findAll)('table tbody tr td')[5].textContent).to.match(/Not imported/);
    });
    (0, _mocha.it)('cannot navigate through data when only one data item is present', async function () {
      (0, _mocha.it)('renders members data with all the properties', async function () {
        this.set('importData', [{
          name: 'Egg',
          email: 'egg@example.com'
        }]);
        await (0, _testHelpers.render)(Ember.HTMLBars.template(
        /*
          
                        <GhMembersImportTable @importData={{this.importData}} />
                    
        */
        {
          "id": "5yIU7ZpY",
          "block": "{\"symbols\":[],\"statements\":[[2,\"\\n                \"],[8,\"gh-members-import-table\",[],[[\"@importData\"],[[32,0,[\"importData\"]]]],null],[2,\"\\n            \"]],\"hasEval\":false,\"upvars\":[]}",
          "moduleName": "(unknown template module)"
        }));
        await (0, _testHelpers.click)('[data-test-import-prev]');
        (0, _chai.expect)((0, _testHelpers.findAll)('table tbody tr').length).to.equal(2);
        (0, _chai.expect)((0, _testHelpers.findAll)('table tbody tr td')[0].textContent).to.equal('name');
        (0, _chai.expect)((0, _testHelpers.findAll)('table tbody tr td')[1].textContent).to.equal('Egg');
        (0, _chai.expect)((0, _testHelpers.findAll)('table tbody tr td')[2].textContent).to.equal('email');
        (0, _chai.expect)((0, _testHelpers.findAll)('table tbody tr td')[3].textContent).to.equal('egg@example.com');
        await (0, _testHelpers.click)('[data-test-import-next]');
        (0, _chai.expect)((0, _testHelpers.findAll)('table tbody tr').length).to.equal(2);
        (0, _chai.expect)((0, _testHelpers.findAll)('table tbody tr td')[0].textContent).to.equal('name');
        (0, _chai.expect)((0, _testHelpers.findAll)('table tbody tr td')[1].textContent).to.equal('Egg');
        (0, _chai.expect)((0, _testHelpers.findAll)('table tbody tr td')[2].textContent).to.equal('email');
        (0, _chai.expect)((0, _testHelpers.findAll)('table tbody tr td')[3].textContent).to.equal('egg@example.com');
      });
    });
  });
});
define("ghost-admin/tests/integration/components/gh-navitem-test", ["ghost-admin/models/navigation-item", "@ember/test-helpers", "mocha", "chai", "ember-mocha"], function (_navigationItem, _testHelpers, _mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Integration: Component: gh-navitem', function () {
    (0, _emberMocha.setupRenderingTest)();
    beforeEach(function () {
      this.set('baseUrl', 'http://localhost:2368');
    });
    (0, _mocha.it)('renders', async function () {
      this.set('navItem', _navigationItem.default.create({
        label: 'Test',
        url: '/url'
      }));
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-navitem navItem=navItem baseUrl=baseUrl}}
      */
      {
        "id": "dcfwnbAU",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,2],null,[[\"navItem\",\"baseUrl\"],[[35,1],[35,0]]]]]],\"hasEval\":false,\"upvars\":[\"baseUrl\",\"navItem\",\"gh-navitem\"]}",
        "moduleName": "(unknown template module)"
      }));
      let item = (0, _testHelpers.find)('.gh-blognav-item');
      (0, _chai.expect)(item.querySelector('.gh-blognav-grab')).to.exist;
      (0, _chai.expect)(item.querySelector('.gh-blognav-label')).to.exist;
      (0, _chai.expect)(item.querySelector('.gh-blognav-url')).to.exist;
      (0, _chai.expect)(item.querySelector('.gh-blognav-delete')).to.exist; // doesn't show any errors

      (0, _chai.expect)((0, _testHelpers.find)('.gh-blognav-item--error')).to.not.exist;
      (0, _chai.expect)((0, _testHelpers.find)('.error')).to.not.exist;
      (0, _chai.expect)((0, _testHelpers.find)('.response')).to.not.be.displayed;
    });
    (0, _mocha.it)('doesn\'t show drag handle for new items', async function () {
      this.set('navItem', _navigationItem.default.create({
        label: 'Test',
        url: '/url',
        isNew: true
      }));
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-navitem navItem=navItem baseUrl=baseUrl}}
      */
      {
        "id": "dcfwnbAU",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,2],null,[[\"navItem\",\"baseUrl\"],[[35,1],[35,0]]]]]],\"hasEval\":false,\"upvars\":[\"baseUrl\",\"navItem\",\"gh-navitem\"]}",
        "moduleName": "(unknown template module)"
      }));
      let item = (0, _testHelpers.find)('.gh-blognav-item');
      (0, _chai.expect)(item.querySelector('.gh-blognav-grab')).to.not.exist;
    });
    (0, _mocha.it)('shows add button for new items', async function () {
      this.set('navItem', _navigationItem.default.create({
        label: 'Test',
        url: '/url',
        isNew: true
      }));
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-navitem navItem=navItem baseUrl=baseUrl}}
      */
      {
        "id": "dcfwnbAU",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,2],null,[[\"navItem\",\"baseUrl\"],[[35,1],[35,0]]]]]],\"hasEval\":false,\"upvars\":[\"baseUrl\",\"navItem\",\"gh-navitem\"]}",
        "moduleName": "(unknown template module)"
      }));
      let item = (0, _testHelpers.find)('.gh-blognav-item');
      (0, _chai.expect)(item.querySelector('.gh-blognav-add')).to.exist;
      (0, _chai.expect)(item.querySelector('.gh-blognav-delete')).to.not.exist;
    });
    (0, _mocha.it)('triggers delete action', async function () {
      this.set('navItem', _navigationItem.default.create({
        label: 'Test',
        url: '/url'
      }));
      let deleteActionCallCount = 0;
      this.set('deleteItem', navItem => {
        (0, _chai.expect)(navItem).to.equal(this.navItem);
        deleteActionCallCount += 1;
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-navitem navItem=navItem baseUrl=baseUrl deleteItem=(action deleteItem)}}
      */
      {
        "id": "aNqzDpRA",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,4],null,[[\"navItem\",\"baseUrl\",\"deleteItem\"],[[35,3],[35,2],[30,[36,1],[[32,0],[35,0]],null]]]]]],\"hasEval\":false,\"upvars\":[\"deleteItem\",\"action\",\"baseUrl\",\"navItem\",\"gh-navitem\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _testHelpers.click)('.gh-blognav-delete');
      (0, _chai.expect)(deleteActionCallCount).to.equal(1);
    });
    (0, _mocha.it)('triggers add action', async function () {
      this.set('navItem', _navigationItem.default.create({
        label: 'Test',
        url: '/url',
        isNew: true
      }));
      let addActionCallCount = 0;
      this.set('add', () => {
        addActionCallCount += 1;
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-navitem navItem=navItem baseUrl=baseUrl addItem=(action add)}}
      */
      {
        "id": "Kz3lYDIj",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,4],null,[[\"navItem\",\"baseUrl\",\"addItem\"],[[35,3],[35,2],[30,[36,1],[[32,0],[35,0]],null]]]]]],\"hasEval\":false,\"upvars\":[\"add\",\"action\",\"baseUrl\",\"navItem\",\"gh-navitem\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _testHelpers.click)('.gh-blognav-add');
      (0, _chai.expect)(addActionCallCount).to.equal(1);
    });
    (0, _mocha.it)('triggers update url action', async function () {
      this.set('navItem', _navigationItem.default.create({
        label: 'Test',
        url: '/url'
      }));
      let updateActionCallCount = 0;
      this.set('update', value => {
        updateActionCallCount += 1;
        return value;
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-navitem navItem=navItem baseUrl=baseUrl updateUrl=(action update)}}
      */
      {
        "id": "J/eVVXaT",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,4],null,[[\"navItem\",\"baseUrl\",\"updateUrl\"],[[35,3],[35,2],[30,[36,1],[[32,0],[35,0]],null]]]]]],\"hasEval\":false,\"upvars\":[\"update\",\"action\",\"baseUrl\",\"navItem\",\"gh-navitem\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _testHelpers.triggerEvent)('.gh-blognav-url input', 'blur');
      (0, _chai.expect)(updateActionCallCount).to.equal(1);
    });
    (0, _mocha.it)('triggers update label action', async function () {
      this.set('navItem', _navigationItem.default.create({
        label: 'Test',
        url: '/url'
      }));
      let updateActionCallCount = 0;
      this.set('update', value => {
        updateActionCallCount += 1;
        return value;
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-navitem navItem=navItem baseUrl=baseUrl updateLabel=(action update)}}
      */
      {
        "id": "3VxHwCcn",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,4],null,[[\"navItem\",\"baseUrl\",\"updateLabel\"],[[35,3],[35,2],[30,[36,1],[[32,0],[35,0]],null]]]]]],\"hasEval\":false,\"upvars\":[\"update\",\"action\",\"baseUrl\",\"navItem\",\"gh-navitem\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _testHelpers.triggerEvent)('.gh-blognav-label input', 'blur');
      (0, _chai.expect)(updateActionCallCount).to.equal(2);
    });
    (0, _mocha.it)('displays inline errors', async function () {
      this.set('navItem', _navigationItem.default.create({
        label: '',
        url: ''
      }));
      this.navItem.validate();
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-navitem navItem=navItem baseUrl=baseUrl}}
      */
      {
        "id": "dcfwnbAU",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,2],null,[[\"navItem\",\"baseUrl\"],[[35,1],[35,0]]]]]],\"hasEval\":false,\"upvars\":[\"baseUrl\",\"navItem\",\"gh-navitem\"]}",
        "moduleName": "(unknown template module)"
      }));
      let item = (0, _testHelpers.find)('.gh-blognav-item');
      (0, _chai.expect)(item).to.have.class('gh-blognav-item--error');
      (0, _chai.expect)(item.querySelector('.gh-blognav-label')).to.have.class('error');
      (0, _chai.expect)(item.querySelector('.gh-blognav-label .response')).to.have.trimmed.text('You must specify a label');
      (0, _chai.expect)(item.querySelector('.gh-blognav-url')).to.have.class('error');
      (0, _chai.expect)(item.querySelector('.gh-blognav-url .response')).to.have.trimmed.text('You must specify a URL or relative path');
    });
  });
});
define("ghost-admin/tests/integration/components/gh-navitem-url-input-test", ["@ember/test-helpers", "mocha", "chai", "ember-mocha"], function (_testHelpers, _mocha, _chai, _emberMocha) {
  "use strict";

  // we want baseUrl to match the running domain so relative URLs are
  // handled as expected (browser auto-sets the domain when using a.href)
  let currentUrl = `${window.location.protocol}//${window.location.host}/`;
  (0, _mocha.describe)('Integration: Component: gh-navitem-url-input', function () {
    (0, _emberMocha.setupRenderingTest)();
    beforeEach(function () {
      // set defaults
      this.set('baseUrl', currentUrl);
      this.set('url', '');
      this.set('isNew', false);
      this.set('clearErrors', function () {
        return null;
      });
    });
    (0, _mocha.it)('renders correctly with blank url', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        
                  {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew clearErrors=(action clearErrors)}}
              
      */
      {
        "id": "30CYcInz",
        "block": "{\"symbols\":[],\"statements\":[[2,\"\\n            \"],[1,[30,[36,5],null,[[\"baseUrl\",\"url\",\"isNew\",\"clearErrors\"],[[35,4],[35,3],[35,2],[30,[36,1],[[32,0],[35,0]],null]]]]],[2,\"\\n        \"]],\"hasEval\":false,\"upvars\":[\"clearErrors\",\"action\",\"isNew\",\"url\",\"baseUrl\",\"gh-navitem-url-input\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.findAll)('input')).to.have.length(1);
      (0, _chai.expect)((0, _testHelpers.find)('input')).to.have.class('gh-input');
      (0, _chai.expect)((0, _testHelpers.find)('input')).to.have.value(currentUrl);
    });
    (0, _mocha.it)('renders correctly with relative urls', async function () {
      this.set('url', '/about');
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        
                  {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew clearErrors=(action clearErrors)}}
              
      */
      {
        "id": "30CYcInz",
        "block": "{\"symbols\":[],\"statements\":[[2,\"\\n            \"],[1,[30,[36,5],null,[[\"baseUrl\",\"url\",\"isNew\",\"clearErrors\"],[[35,4],[35,3],[35,2],[30,[36,1],[[32,0],[35,0]],null]]]]],[2,\"\\n        \"]],\"hasEval\":false,\"upvars\":[\"clearErrors\",\"action\",\"isNew\",\"url\",\"baseUrl\",\"gh-navitem-url-input\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.find)('input')).to.have.value(`${currentUrl}about`);
      this.set('url', '/about#contact');
      (0, _chai.expect)((0, _testHelpers.find)('input')).to.have.value(`${currentUrl}about#contact`);
    });
    (0, _mocha.it)('renders correctly with absolute urls', async function () {
      this.set('url', 'https://example.com:2368/#test');
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        
                  {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew clearErrors=(action clearErrors)}}
              
      */
      {
        "id": "30CYcInz",
        "block": "{\"symbols\":[],\"statements\":[[2,\"\\n            \"],[1,[30,[36,5],null,[[\"baseUrl\",\"url\",\"isNew\",\"clearErrors\"],[[35,4],[35,3],[35,2],[30,[36,1],[[32,0],[35,0]],null]]]]],[2,\"\\n        \"]],\"hasEval\":false,\"upvars\":[\"clearErrors\",\"action\",\"isNew\",\"url\",\"baseUrl\",\"gh-navitem-url-input\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.find)('input')).to.have.value('https://example.com:2368/#test');
      this.set('url', 'mailto:test@example.com');
      (0, _chai.expect)((0, _testHelpers.find)('input')).to.have.value('mailto:test@example.com');
      this.set('url', 'tel:01234-5678-90');
      (0, _chai.expect)((0, _testHelpers.find)('input')).to.have.value('tel:01234-5678-90');
      this.set('url', '//protocol-less-url.com');
      (0, _chai.expect)((0, _testHelpers.find)('input')).to.have.value('//protocol-less-url.com');
      this.set('url', '#anchor');
      (0, _chai.expect)((0, _testHelpers.find)('input')).to.have.value('#anchor');
    });
    (0, _mocha.it)('deletes base URL on backspace', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        
                  {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew clearErrors=(action clearErrors)}}
              
      */
      {
        "id": "30CYcInz",
        "block": "{\"symbols\":[],\"statements\":[[2,\"\\n            \"],[1,[30,[36,5],null,[[\"baseUrl\",\"url\",\"isNew\",\"clearErrors\"],[[35,4],[35,3],[35,2],[30,[36,1],[[32,0],[35,0]],null]]]]],[2,\"\\n        \"]],\"hasEval\":false,\"upvars\":[\"clearErrors\",\"action\",\"isNew\",\"url\",\"baseUrl\",\"gh-navitem-url-input\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.find)('input')).to.have.value(currentUrl);
      await (0, _testHelpers.triggerKeyEvent)('input', 'keydown', 8);
      (0, _chai.expect)((0, _testHelpers.find)('input')).to.have.value('');
    });
    (0, _mocha.it)('deletes base URL on delete', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        
                  {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew clearErrors=(action clearErrors)}}
              
      */
      {
        "id": "30CYcInz",
        "block": "{\"symbols\":[],\"statements\":[[2,\"\\n            \"],[1,[30,[36,5],null,[[\"baseUrl\",\"url\",\"isNew\",\"clearErrors\"],[[35,4],[35,3],[35,2],[30,[36,1],[[32,0],[35,0]],null]]]]],[2,\"\\n        \"]],\"hasEval\":false,\"upvars\":[\"clearErrors\",\"action\",\"isNew\",\"url\",\"baseUrl\",\"gh-navitem-url-input\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.find)('input')).to.have.value(currentUrl);
      await (0, _testHelpers.triggerKeyEvent)('input', 'keydown', 46);
      (0, _chai.expect)((0, _testHelpers.find)('input')).to.have.value('');
    });
    (0, _mocha.it)('adds base url to relative urls on blur', async function () {
      this.set('updateUrl', val => val);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        
                  {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew update=(action updateUrl) clearErrors=(action clearErrors)}}
              
      */
      {
        "id": "7Snn0gaQ",
        "block": "{\"symbols\":[],\"statements\":[[2,\"\\n            \"],[1,[30,[36,6],null,[[\"baseUrl\",\"url\",\"isNew\",\"update\",\"clearErrors\"],[[35,5],[35,4],[35,3],[30,[36,1],[[32,0],[35,2]],null],[30,[36,1],[[32,0],[35,0]],null]]]]],[2,\"\\n        \"]],\"hasEval\":false,\"upvars\":[\"clearErrors\",\"action\",\"updateUrl\",\"isNew\",\"url\",\"baseUrl\",\"gh-navitem-url-input\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _testHelpers.fillIn)('input', '/about');
      await (0, _testHelpers.blur)('input');
      (0, _chai.expect)((0, _testHelpers.find)('input')).to.have.value(`${currentUrl}about/`);
    });
    (0, _mocha.it)('adds "mailto:" to email addresses on blur', async function () {
      this.set('updateUrl', val => val);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        
                  {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew update=(action updateUrl) clearErrors=(action clearErrors)}}
              
      */
      {
        "id": "7Snn0gaQ",
        "block": "{\"symbols\":[],\"statements\":[[2,\"\\n            \"],[1,[30,[36,6],null,[[\"baseUrl\",\"url\",\"isNew\",\"update\",\"clearErrors\"],[[35,5],[35,4],[35,3],[30,[36,1],[[32,0],[35,2]],null],[30,[36,1],[[32,0],[35,0]],null]]]]],[2,\"\\n        \"]],\"hasEval\":false,\"upvars\":[\"clearErrors\",\"action\",\"updateUrl\",\"isNew\",\"url\",\"baseUrl\",\"gh-navitem-url-input\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _testHelpers.fillIn)('input', 'test@example.com');
      await (0, _testHelpers.blur)('input');
      (0, _chai.expect)((0, _testHelpers.find)('input')).to.have.value('mailto:test@example.com'); // ensure we don't double-up on the mailto:

      await (0, _testHelpers.blur)('input');
      (0, _chai.expect)((0, _testHelpers.find)('input')).to.have.value('mailto:test@example.com');
    });
    (0, _mocha.it)('doesn\'t add base url to invalid urls on blur', async function () {
      this.set('updateUrl', val => val);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        
                  {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew update=(action updateUrl) clearErrors=(action clearErrors)}}
              
      */
      {
        "id": "7Snn0gaQ",
        "block": "{\"symbols\":[],\"statements\":[[2,\"\\n            \"],[1,[30,[36,6],null,[[\"baseUrl\",\"url\",\"isNew\",\"update\",\"clearErrors\"],[[35,5],[35,4],[35,3],[30,[36,1],[[32,0],[35,2]],null],[30,[36,1],[[32,0],[35,0]],null]]]]],[2,\"\\n        \"]],\"hasEval\":false,\"upvars\":[\"clearErrors\",\"action\",\"updateUrl\",\"isNew\",\"url\",\"baseUrl\",\"gh-navitem-url-input\"]}",
        "moduleName": "(unknown template module)"
      }));

      let changeValue = async value => {
        await (0, _testHelpers.fillIn)('input', value);
        await (0, _testHelpers.blur)('input');
      };

      await changeValue('with spaces');
      (0, _chai.expect)((0, _testHelpers.find)('input')).to.have.value('with spaces');
      await changeValue('/with spaces');
      (0, _chai.expect)((0, _testHelpers.find)('input')).to.have.value('/with spaces');
    });
    (0, _mocha.it)('doesn\'t mangle invalid urls on blur', async function () {
      this.set('updateUrl', val => val);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        
                  {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew update=(action updateUrl) clearErrors=(action clearErrors)}}
              
      */
      {
        "id": "7Snn0gaQ",
        "block": "{\"symbols\":[],\"statements\":[[2,\"\\n            \"],[1,[30,[36,6],null,[[\"baseUrl\",\"url\",\"isNew\",\"update\",\"clearErrors\"],[[35,5],[35,4],[35,3],[30,[36,1],[[32,0],[35,2]],null],[30,[36,1],[[32,0],[35,0]],null]]]]],[2,\"\\n        \"]],\"hasEval\":false,\"upvars\":[\"clearErrors\",\"action\",\"updateUrl\",\"isNew\",\"url\",\"baseUrl\",\"gh-navitem-url-input\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _testHelpers.fillIn)('input', `${currentUrl} /test`);
      await (0, _testHelpers.blur)('input');
      (0, _chai.expect)((0, _testHelpers.find)('input')).to.have.value(`${currentUrl} /test`);
    }); // https://github.com/TryGhost/Ghost/issues/9373

    (0, _mocha.it)('doesn\'t mangle urls when baseUrl has unicode characters', async function () {
      this.set('updateUrl', val => val);
      this.set('baseUrl', 'http://exämple.com');
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        
                  {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew update=(action updateUrl) clearErrors=(action clearErrors)}}
              
      */
      {
        "id": "7Snn0gaQ",
        "block": "{\"symbols\":[],\"statements\":[[2,\"\\n            \"],[1,[30,[36,6],null,[[\"baseUrl\",\"url\",\"isNew\",\"update\",\"clearErrors\"],[[35,5],[35,4],[35,3],[30,[36,1],[[32,0],[35,2]],null],[30,[36,1],[[32,0],[35,0]],null]]]]],[2,\"\\n        \"]],\"hasEval\":false,\"upvars\":[\"clearErrors\",\"action\",\"updateUrl\",\"isNew\",\"url\",\"baseUrl\",\"gh-navitem-url-input\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _testHelpers.fillIn)('input', `${currentUrl}/test`);
      await (0, _testHelpers.blur)('input');
      (0, _chai.expect)((0, _testHelpers.find)('input')).to.have.value(`${currentUrl}/test`);
    });
    (0, _mocha.it)('triggers "update" action on blur', async function () {
      let changeActionCallCount = 0;
      this.set('updateUrl', val => {
        changeActionCallCount += 1;
        return val;
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        
                  {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew update=(action updateUrl) clearErrors=(action clearErrors)}}
              
      */
      {
        "id": "7Snn0gaQ",
        "block": "{\"symbols\":[],\"statements\":[[2,\"\\n            \"],[1,[30,[36,6],null,[[\"baseUrl\",\"url\",\"isNew\",\"update\",\"clearErrors\"],[[35,5],[35,4],[35,3],[30,[36,1],[[32,0],[35,2]],null],[30,[36,1],[[32,0],[35,0]],null]]]]],[2,\"\\n        \"]],\"hasEval\":false,\"upvars\":[\"clearErrors\",\"action\",\"updateUrl\",\"isNew\",\"url\",\"baseUrl\",\"gh-navitem-url-input\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _testHelpers.click)('input');
      await (0, _testHelpers.blur)('input');
      (0, _chai.expect)(changeActionCallCount).to.equal(1);
    });
    (0, _mocha.it)('triggers "update" action on enter', async function () {
      let changeActionCallCount = 0;
      this.set('updateUrl', val => {
        changeActionCallCount += 1;
        return val;
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        
                  {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew update=(action updateUrl) clearErrors=(action clearErrors)}}
              
      */
      {
        "id": "7Snn0gaQ",
        "block": "{\"symbols\":[],\"statements\":[[2,\"\\n            \"],[1,[30,[36,6],null,[[\"baseUrl\",\"url\",\"isNew\",\"update\",\"clearErrors\"],[[35,5],[35,4],[35,3],[30,[36,1],[[32,0],[35,2]],null],[30,[36,1],[[32,0],[35,0]],null]]]]],[2,\"\\n        \"]],\"hasEval\":false,\"upvars\":[\"clearErrors\",\"action\",\"updateUrl\",\"isNew\",\"url\",\"baseUrl\",\"gh-navitem-url-input\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _testHelpers.triggerKeyEvent)('input', 'keypress', 13);
      (0, _chai.expect)(changeActionCallCount).to.equal(1);
    });
    (0, _mocha.it)('triggers "update" action on CMD-S', async function () {
      let changeActionCallCount = 0;
      this.set('updateUrl', val => {
        changeActionCallCount += 1;
        return val;
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        
                  {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew update=(action updateUrl) clearErrors=(action clearErrors)}}
              
      */
      {
        "id": "7Snn0gaQ",
        "block": "{\"symbols\":[],\"statements\":[[2,\"\\n            \"],[1,[30,[36,6],null,[[\"baseUrl\",\"url\",\"isNew\",\"update\",\"clearErrors\"],[[35,5],[35,4],[35,3],[30,[36,1],[[32,0],[35,2]],null],[30,[36,1],[[32,0],[35,0]],null]]]]],[2,\"\\n        \"]],\"hasEval\":false,\"upvars\":[\"clearErrors\",\"action\",\"updateUrl\",\"isNew\",\"url\",\"baseUrl\",\"gh-navitem-url-input\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _testHelpers.triggerKeyEvent)('input', 'keydown', 83, {
        metaKey: true
      });
      (0, _chai.expect)(changeActionCallCount).to.equal(1);
    });
    (0, _mocha.it)('sends absolute urls straight through to update action', async function () {
      let lastSeenUrl = '';
      this.set('updateUrl', url => {
        lastSeenUrl = url;
        return url;
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        
                  {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew update=(action updateUrl) clearErrors=(action clearErrors)}}
              
      */
      {
        "id": "7Snn0gaQ",
        "block": "{\"symbols\":[],\"statements\":[[2,\"\\n            \"],[1,[30,[36,6],null,[[\"baseUrl\",\"url\",\"isNew\",\"update\",\"clearErrors\"],[[35,5],[35,4],[35,3],[30,[36,1],[[32,0],[35,2]],null],[30,[36,1],[[32,0],[35,0]],null]]]]],[2,\"\\n        \"]],\"hasEval\":false,\"upvars\":[\"clearErrors\",\"action\",\"updateUrl\",\"isNew\",\"url\",\"baseUrl\",\"gh-navitem-url-input\"]}",
        "moduleName": "(unknown template module)"
      }));

      let testUrl = async url => {
        await (0, _testHelpers.fillIn)('input', url);
        await (0, _testHelpers.blur)('input');
        (0, _chai.expect)(lastSeenUrl).to.equal(url);
      };

      await testUrl('http://example.com');
      await testUrl('http://example.com/');
      await testUrl('https://example.com');
      await testUrl('//example.com');
      await testUrl('//localhost:1234');
      await testUrl('#anchor');
      await testUrl('mailto:test@example.com');
      await testUrl('tel:12345-567890');
      await testUrl('javascript:alert("testing");');
    });
    (0, _mocha.it)('strips base url from relative urls before sending to update action', async function () {
      let lastSeenUrl = '';
      this.set('updateUrl', url => {
        lastSeenUrl = url;
        return url;
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        
                  {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew update=(action updateUrl) clearErrors=(action clearErrors)}}
              
      */
      {
        "id": "7Snn0gaQ",
        "block": "{\"symbols\":[],\"statements\":[[2,\"\\n            \"],[1,[30,[36,6],null,[[\"baseUrl\",\"url\",\"isNew\",\"update\",\"clearErrors\"],[[35,5],[35,4],[35,3],[30,[36,1],[[32,0],[35,2]],null],[30,[36,1],[[32,0],[35,0]],null]]]]],[2,\"\\n        \"]],\"hasEval\":false,\"upvars\":[\"clearErrors\",\"action\",\"updateUrl\",\"isNew\",\"url\",\"baseUrl\",\"gh-navitem-url-input\"]}",
        "moduleName": "(unknown template module)"
      }));

      let testUrl = async url => {
        await (0, _testHelpers.fillIn)('input', `${currentUrl}${url}`);
        await (0, _testHelpers.blur)('input');
        (0, _chai.expect)(lastSeenUrl).to.equal(`/${url}`);
      };

      await testUrl('about/');
      await testUrl('about#contact');
      await testUrl('test/nested/');
    });
    (0, _mocha.it)('handles links to subdomains of blog domain', async function () {
      let expectedUrl = '';
      this.set('baseUrl', 'http://example.com/');
      this.set('updateUrl', url => {
        (0, _chai.expect)(url).to.equal(expectedUrl);
        return url;
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        
                  {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew update=(action updateUrl) clearErrors=(action clearErrors)}}
              
      */
      {
        "id": "7Snn0gaQ",
        "block": "{\"symbols\":[],\"statements\":[[2,\"\\n            \"],[1,[30,[36,6],null,[[\"baseUrl\",\"url\",\"isNew\",\"update\",\"clearErrors\"],[[35,5],[35,4],[35,3],[30,[36,1],[[32,0],[35,2]],null],[30,[36,1],[[32,0],[35,0]],null]]]]],[2,\"\\n        \"]],\"hasEval\":false,\"upvars\":[\"clearErrors\",\"action\",\"updateUrl\",\"isNew\",\"url\",\"baseUrl\",\"gh-navitem-url-input\"]}",
        "moduleName": "(unknown template module)"
      }));
      expectedUrl = 'http://test.example.com/';
      await (0, _testHelpers.fillIn)('input', expectedUrl);
      await (0, _testHelpers.blur)('input');
      (0, _chai.expect)((0, _testHelpers.find)('input')).to.have.value(expectedUrl);
    });
    (0, _mocha.it)('adds trailing slash to relative URL', async function () {
      let lastSeenUrl = '';
      this.set('updateUrl', url => {
        lastSeenUrl = url;
        return url;
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        
                  {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew update=(action updateUrl) clearErrors=(action clearErrors)}}
              
      */
      {
        "id": "7Snn0gaQ",
        "block": "{\"symbols\":[],\"statements\":[[2,\"\\n            \"],[1,[30,[36,6],null,[[\"baseUrl\",\"url\",\"isNew\",\"update\",\"clearErrors\"],[[35,5],[35,4],[35,3],[30,[36,1],[[32,0],[35,2]],null],[30,[36,1],[[32,0],[35,0]],null]]]]],[2,\"\\n        \"]],\"hasEval\":false,\"upvars\":[\"clearErrors\",\"action\",\"updateUrl\",\"isNew\",\"url\",\"baseUrl\",\"gh-navitem-url-input\"]}",
        "moduleName": "(unknown template module)"
      }));

      let testUrl = async url => {
        await (0, _testHelpers.fillIn)('input', `${currentUrl}${url}`);
        await (0, _testHelpers.blur)('input');
        (0, _chai.expect)(lastSeenUrl).to.equal(`/${url}/`);
      };

      await testUrl('about');
      await testUrl('test/nested');
    });
    (0, _mocha.it)('does not add trailing slash on relative URL with [.?#]', async function () {
      let lastSeenUrl = '';
      this.set('updateUrl', url => {
        lastSeenUrl = url;
        return url;
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        
                  {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew update=(action updateUrl) clearErrors=(action clearErrors)}}
              
      */
      {
        "id": "7Snn0gaQ",
        "block": "{\"symbols\":[],\"statements\":[[2,\"\\n            \"],[1,[30,[36,6],null,[[\"baseUrl\",\"url\",\"isNew\",\"update\",\"clearErrors\"],[[35,5],[35,4],[35,3],[30,[36,1],[[32,0],[35,2]],null],[30,[36,1],[[32,0],[35,0]],null]]]]],[2,\"\\n        \"]],\"hasEval\":false,\"upvars\":[\"clearErrors\",\"action\",\"updateUrl\",\"isNew\",\"url\",\"baseUrl\",\"gh-navitem-url-input\"]}",
        "moduleName": "(unknown template module)"
      }));

      let testUrl = async url => {
        await (0, _testHelpers.fillIn)('input', `${currentUrl}${url}`);
        await (0, _testHelpers.blur)('input');
        (0, _chai.expect)(lastSeenUrl).to.equal(`/${url}`);
      };

      await testUrl('about#contact');
      await testUrl('test/nested.svg');
      await testUrl('test?gho=sties');
      await testUrl('test/nested?sli=mer');
    });
    (0, _mocha.it)('does not add trailing slash on non-relative URLs', async function () {
      let lastSeenUrl = '';
      this.set('updateUrl', url => {
        lastSeenUrl = url;
        return url;
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        
                  {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew update=(action updateUrl) clearErrors=(action clearErrors)}}
              
      */
      {
        "id": "7Snn0gaQ",
        "block": "{\"symbols\":[],\"statements\":[[2,\"\\n            \"],[1,[30,[36,6],null,[[\"baseUrl\",\"url\",\"isNew\",\"update\",\"clearErrors\"],[[35,5],[35,4],[35,3],[30,[36,1],[[32,0],[35,2]],null],[30,[36,1],[[32,0],[35,0]],null]]]]],[2,\"\\n        \"]],\"hasEval\":false,\"upvars\":[\"clearErrors\",\"action\",\"updateUrl\",\"isNew\",\"url\",\"baseUrl\",\"gh-navitem-url-input\"]}",
        "moduleName": "(unknown template module)"
      }));

      let testUrl = async url => {
        await (0, _testHelpers.fillIn)('input', url);
        await (0, _testHelpers.blur)('input');
        (0, _chai.expect)(lastSeenUrl).to.equal(url);
      };

      await testUrl('http://woo.ff/test');
      await testUrl('http://me.ow:2342/nested/test');
      await testUrl('https://wro.om/car#race');
      await testUrl('https://kabo.om/explosion?really=now');
    });
    (0, _mocha.describe)('with sub-folder baseUrl', function () {
      beforeEach(function () {
        this.set('baseUrl', `${currentUrl}blog/`);
      });
      (0, _mocha.it)('handles URLs relative to base url', async function () {
        let lastSeenUrl = '';
        this.set('updateUrl', url => {
          lastSeenUrl = url;
          return url;
        });
        await (0, _testHelpers.render)(Ember.HTMLBars.template(
        /*
          
                        {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew update=(action updateUrl) clearErrors=(action clearErrors)}}
                    
        */
        {
          "id": "E50Dd0YV",
          "block": "{\"symbols\":[],\"statements\":[[2,\"\\n                \"],[1,[30,[36,6],null,[[\"baseUrl\",\"url\",\"isNew\",\"update\",\"clearErrors\"],[[35,5],[35,4],[35,3],[30,[36,1],[[32,0],[35,2]],null],[30,[36,1],[[32,0],[35,0]],null]]]]],[2,\"\\n            \"]],\"hasEval\":false,\"upvars\":[\"clearErrors\",\"action\",\"updateUrl\",\"isNew\",\"url\",\"baseUrl\",\"gh-navitem-url-input\"]}",
          "moduleName": "(unknown template module)"
        }));

        let testUrl = async url => {
          await (0, _testHelpers.fillIn)('input', `${currentUrl}blog${url}`);
          await (0, _testHelpers.blur)('input');
          (0, _chai.expect)(lastSeenUrl).to.equal(url);
        };

        await testUrl('/about/');
        await testUrl('/about#contact');
        await testUrl('/test/nested/');
      });
      (0, _mocha.it)('handles URLs relative to base host', async function () {
        let lastSeenUrl = '';
        this.set('updateUrl', url => {
          lastSeenUrl = url;
          return url;
        });
        await (0, _testHelpers.render)(Ember.HTMLBars.template(
        /*
          
                        {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew update=(action updateUrl) clearErrors=(action clearErrors)}}
                    
        */
        {
          "id": "E50Dd0YV",
          "block": "{\"symbols\":[],\"statements\":[[2,\"\\n                \"],[1,[30,[36,6],null,[[\"baseUrl\",\"url\",\"isNew\",\"update\",\"clearErrors\"],[[35,5],[35,4],[35,3],[30,[36,1],[[32,0],[35,2]],null],[30,[36,1],[[32,0],[35,0]],null]]]]],[2,\"\\n            \"]],\"hasEval\":false,\"upvars\":[\"clearErrors\",\"action\",\"updateUrl\",\"isNew\",\"url\",\"baseUrl\",\"gh-navitem-url-input\"]}",
          "moduleName": "(unknown template module)"
        }));

        let testUrl = async url => {
          await (0, _testHelpers.fillIn)('input', url);
          await (0, _testHelpers.blur)('input');
          (0, _chai.expect)(lastSeenUrl).to.equal(url);
        };

        await testUrl(`http://${window.location.host}`);
        await testUrl(`https://${window.location.host}`);
        await testUrl(`http://${window.location.host}/`);
        await testUrl(`https://${window.location.host}/`);
        await testUrl(`http://${window.location.host}/test`);
        await testUrl(`https://${window.location.host}/test`);
        await testUrl(`http://${window.location.host}/#test`);
        await testUrl(`https://${window.location.host}/#test`);
        await testUrl(`http://${window.location.host}/another/folder`);
        await testUrl(`https://${window.location.host}/another/folder`);
      });
    });
  });
});
define("ghost-admin/tests/integration/components/gh-notification-test", ["sinon", "@ember/test-helpers", "mocha", "chai", "ember-mocha"], function (_sinon, _testHelpers, _mocha, _chai, _emberMocha) {
  "use strict";

  var _dec, _dec2, _class, _descriptor, _descriptor2;

  function _initializerDefineProperty(target, property, descriptor, context) { if (!descriptor) return; Object.defineProperty(target, property, { enumerable: descriptor.enumerable, configurable: descriptor.configurable, writable: descriptor.writable, value: descriptor.initializer ? descriptor.initializer.call(context) : void 0 }); }

  function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  function _initializerWarningHelper(descriptor, context) { throw new Error('Decorating class property failed. Please ensure that ' + 'proposal-class-properties is enabled and runs after the decorators transform.'); }

  let Message = (_dec = Ember._tracked, _dec2 = Ember._tracked, (_class = class Message {
    constructor(_ref) {
      let {
        message,
        type
      } = _ref;

      _initializerDefineProperty(this, "message", _descriptor, this);

      _initializerDefineProperty(this, "type", _descriptor2, this);

      this.message = message;
      this.type = type;
    }

  }, (_descriptor = _applyDecoratedDescriptor(_class.prototype, "message", [_dec], {
    configurable: true,
    enumerable: true,
    writable: true,
    initializer: null
  }), _descriptor2 = _applyDecoratedDescriptor(_class.prototype, "type", [_dec2], {
    configurable: true,
    enumerable: true,
    writable: true,
    initializer: null
  })), _class));

  window.__CLASSIC_HAS_CONSTRUCTOR__.set(Message, true);

  window.__CLASSIC_OWN_CLASSES__.set(Message, true);

  (0, _mocha.describe)('Integration: Component: gh-notification', function () {
    (0, _emberMocha.setupRenderingTest)();
    (0, _mocha.it)('renders', async function () {
      this.set('message', new Message({
        message: 'Test message',
        type: 'success'
      }));
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhNotification @message={{this.message}} />
      */
      {
        "id": "uYqYx157",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-notification\",[],[[\"@message\"],[[32,0,[\"message\"]]]],null]],\"hasEval\":false,\"upvars\":[]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.find)('article.gh-notification')).to.exist;
      let notification = (0, _testHelpers.find)('.gh-notification');
      (0, _chai.expect)(notification).to.have.class('gh-notification-passive');
      (0, _chai.expect)(notification).to.contain.text('Test message');
    });
    (0, _mocha.it)('maps message types to CSS classes', async function () {
      this.set('message', new Message({
        message: 'Test message',
        type: 'success'
      }));
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhNotification @message={{this.message}} />
      */
      {
        "id": "uYqYx157",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-notification\",[],[[\"@message\"],[[32,0,[\"message\"]]]],null]],\"hasEval\":false,\"upvars\":[]}",
        "moduleName": "(unknown template module)"
      }));
      let notification = (0, _testHelpers.find)('.gh-notification');
      this.message.type = 'error';
      await (0, _testHelpers.settled)();
      (0, _chai.expect)(notification, 'success class is red').to.have.class('gh-notification-red');
      this.message.type = 'warn';
      await (0, _testHelpers.settled)();
      (0, _chai.expect)(notification, 'success class is yellow').to.have.class('gh-notification-yellow');
    });
    (0, _mocha.it)('closes notification through notifications service', async function () {
      let message = new Message({
        message: 'Test close',
        type: 'success'
      });
      this.set('message', message);
      let notifications = this.owner.lookup('service:notifications');
      notifications.closeNotification = _sinon.default.stub();
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhNotification @message={{this.message}} />
      */
      {
        "id": "uYqYx157",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-notification\",[],[[\"@message\"],[[32,0,[\"message\"]]]],null]],\"hasEval\":false,\"upvars\":[]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.find)('.gh-notification')).to.exist;
      await (0, _testHelpers.click)('[data-test-button="close-notification"]');
      (0, _chai.expect)(notifications.closeNotification.calledWith(message)).to.be.true;
    });
  });
});
define("ghost-admin/tests/integration/components/gh-notifications-test", ["mocha", "chai", "@ember/test-helpers", "ember-mocha"], function (_mocha, _chai, _testHelpers, _emberMocha) {
  "use strict";

  let notificationsStub = Ember.Service.extend({
    notifications: Ember.A()
  });
  (0, _mocha.describe)('Integration: Component: gh-notifications', function () {
    (0, _emberMocha.setupRenderingTest)();
    beforeEach(function () {
      this.owner.register('service:notifications', notificationsStub);
      let notifications = this.owner.lookup('service:notifications');
      notifications.set('notifications', [{
        message: 'First',
        type: 'error'
      }, {
        message: 'Second',
        type: 'warn'
      }]);
    });
    (0, _mocha.it)('renders', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-notifications}}
      */
      {
        "id": "Cv5B+bat",
        "block": "{\"symbols\":[],\"statements\":[[1,[34,0]]],\"hasEval\":false,\"upvars\":[\"gh-notifications\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.find)('.gh-notifications')).to.exist;
      (0, _chai.expect)((0, _testHelpers.find)('.gh-notifications').children.length).to.equal(2);
      let notifications = this.owner.lookup('service:notifications');
      notifications.set('notifications', Ember.A());
      await (0, _testHelpers.settled)();
      (0, _chai.expect)((0, _testHelpers.find)('.gh-notifications').children.length).to.equal(0);
    });
  });
});
define("ghost-admin/tests/integration/components/gh-psm-tags-input-test", ["ghost-admin/mirage/config/posts", "ghost-admin/mirage/config/themes", "@ember/test-helpers", "ember-power-select/test-support/helpers", "mocha", "chai", "ember-mocha", "ghost-admin/initializers/ember-cli-mirage", "ember-concurrency"], function (_posts, _themes, _testHelpers, _helpers, _mocha, _chai, _emberMocha, _emberCliMirage, _emberConcurrency) {
  "use strict";

  // NOTE: although Mirage has posts<->tags relationship and can respond
  // to :post-id/?include=tags all ordering information is lost so we
  // need to build the tags array manually
  const assignPostWithTags = async function postWithTags(context) {
    let post = await context.store.findRecord('post', 1);
    let tags = await context.store.findAll('tag');

    for (var _len = arguments.length, slugs = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      slugs[_key - 1] = arguments[_key];
    }

    slugs.forEach(slug => {
      post.get('tags').pushObject(tags.findBy('slug', slug));
    });
    context.set('post', post);
    await (0, _testHelpers.settled)();
  };

  (0, _mocha.describe)('Integration: Component: gh-psm-tags-input', function () {
    (0, _emberMocha.setupRenderingTest)();
    let server;
    beforeEach(function () {
      server = (0, _emberCliMirage.startMirage)();
      let author = server.create('user');
      (0, _posts.default)(server);
      (0, _themes.default)(server);
      server.create('post', {
        authors: [author]
      });
      server.create('tag', {
        name: 'Tag 1',
        slug: 'one'
      });
      server.create('tag', {
        name: '#Tag 2',
        visibility: 'internal',
        slug: 'two'
      });
      server.create('tag', {
        name: 'Tag 3',
        slug: 'three'
      });
      server.create('tag', {
        name: 'Tag 4',
        slug: 'four'
      });
      this.set('store', this.owner.lookup('service:store'));
    });
    afterEach(function () {
      server.shutdown();
    });
    (0, _mocha.it)('shows selected tags on render', async function () {
      await assignPostWithTags(this, 'one', 'three');
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-psm-tags-input post=post}}
      */
      {
        "id": "lc1mhq6Y",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,1],null,[[\"post\"],[[35,0]]]]]],\"hasEval\":false,\"upvars\":[\"post\",\"gh-psm-tags-input\"]}",
        "moduleName": "(unknown template module)"
      }));
      let selected = (0, _testHelpers.findAll)('.tag-token');
      (0, _chai.expect)(selected.length).to.equal(2);
      (0, _chai.expect)(selected[0]).to.contain.text('Tag 1');
      (0, _chai.expect)(selected[1]).to.contain.text('Tag 3');
    }); // skipped because FF 85 on Linux (CI) is failing. FF 85 on mac is fine.
    // possible difference in `localeCompare()` across systems

    _mocha.it.skip('exposes all tags as options sorted alphabetically', async function () {
      this.set('post', this.store.findRecord('post', 1));
      await (0, _testHelpers.settled)();
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-psm-tags-input post=post}}
      */
      {
        "id": "lc1mhq6Y",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,1],null,[[\"post\"],[[35,0]]]]]],\"hasEval\":false,\"upvars\":[\"post\",\"gh-psm-tags-input\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _helpers.clickTrigger)();
      await (0, _testHelpers.settled)(); // unsure why settled() is sometimes not catching the update

      await (0, _emberConcurrency.timeout)(100);
      let options = (0, _testHelpers.findAll)('.ember-power-select-option');
      (0, _chai.expect)(options.length).to.equal(4);
      (0, _chai.expect)(options[0]).to.contain.text('Tag 1');
      (0, _chai.expect)(options[1]).to.contain.text('#Tag 2');
      (0, _chai.expect)(options[2]).to.contain.text('Tag 3');
      (0, _chai.expect)(options[3]).to.contain.text('Tag 4');
    });

    (0, _mocha.it)('matches options on lowercase tag names', async function () {
      this.set('post', this.store.findRecord('post', 1));
      await (0, _testHelpers.settled)();
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-psm-tags-input post=post}}
      */
      {
        "id": "lc1mhq6Y",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,1],null,[[\"post\"],[[35,0]]]]]],\"hasEval\":false,\"upvars\":[\"post\",\"gh-psm-tags-input\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _helpers.clickTrigger)();
      await (0, _helpers.typeInSearch)('2');
      await (0, _testHelpers.settled)(); // unsure why settled() is sometimes not catching the update

      await (0, _emberConcurrency.timeout)(100);
      let options = (0, _testHelpers.findAll)('.ember-power-select-option');
      (0, _chai.expect)(options.length).to.equal(2);
      (0, _chai.expect)(options[0]).to.contain.text('Add "2"...');
      (0, _chai.expect)(options[1]).to.contain.text('Tag 2');
    });
    (0, _mocha.it)('hides create option on exact matches', async function () {
      this.set('post', this.store.findRecord('post', 1));
      await (0, _testHelpers.settled)();
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-psm-tags-input post=post}}
      */
      {
        "id": "lc1mhq6Y",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,1],null,[[\"post\"],[[35,0]]]]]],\"hasEval\":false,\"upvars\":[\"post\",\"gh-psm-tags-input\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _helpers.clickTrigger)();
      await (0, _helpers.typeInSearch)('#Tag 2');
      await (0, _testHelpers.settled)(); // unsure why settled() is sometimes not catching the update

      await (0, _emberConcurrency.timeout)(100);
      let options = (0, _testHelpers.findAll)('.ember-power-select-option');
      (0, _chai.expect)(options.length).to.equal(1);
      (0, _chai.expect)(options[0]).to.contain.text('#Tag 2');
    });
    (0, _mocha.it)('highlights internal tags', async function () {
      await assignPostWithTags(this, 'two', 'three');
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-psm-tags-input post=post}}
      */
      {
        "id": "lc1mhq6Y",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,1],null,[[\"post\"],[[35,0]]]]]],\"hasEval\":false,\"upvars\":[\"post\",\"gh-psm-tags-input\"]}",
        "moduleName": "(unknown template module)"
      }));
      let selected = (0, _testHelpers.findAll)('.tag-token');
      (0, _chai.expect)(selected.length).to.equal(2);
      (0, _chai.expect)(selected[0]).to.have.class('tag-token--internal');
      (0, _chai.expect)(selected[1]).to.not.have.class('tag-token--internal');
    });
    (0, _mocha.describe)('updateTags', function () {
      (0, _mocha.it)('modifies post.tags', async function () {
        await assignPostWithTags(this, 'two', 'three');
        await (0, _testHelpers.render)(Ember.HTMLBars.template(
        /*
          {{gh-psm-tags-input post=post}}
        */
        {
          "id": "lc1mhq6Y",
          "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,1],null,[[\"post\"],[[35,0]]]]]],\"hasEval\":false,\"upvars\":[\"post\",\"gh-psm-tags-input\"]}",
          "moduleName": "(unknown template module)"
        }));
        await (0, _helpers.selectChoose)('.ember-power-select-trigger', 'Tag 1');
        (0, _chai.expect)(this.post.tags.mapBy('name').join(',')).to.equal('#Tag 2,Tag 3,Tag 1');
      }); // TODO: skipped due to consistently random failures on Travis
      // '#ember-basic-dropdown-content-ember17494 Add "New"...' is not a valid selector
      // https://github.com/TryGhost/Ghost/issues/10308

      _mocha.it.skip('destroys new tag records when not selected', async function () {
        await assignPostWithTags(this, 'two', 'three');
        await (0, _testHelpers.render)(Ember.HTMLBars.template(
        /*
          {{gh-psm-tags-input post=post}}
        */
        {
          "id": "lc1mhq6Y",
          "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,1],null,[[\"post\"],[[35,0]]]]]],\"hasEval\":false,\"upvars\":[\"post\",\"gh-psm-tags-input\"]}",
          "moduleName": "(unknown template module)"
        }));
        await (0, _helpers.clickTrigger)();
        await (0, _helpers.typeInSearch)('New');
        await (0, _testHelpers.settled)();
        await (0, _helpers.selectChoose)('.ember-power-select-trigger', 'Add "New"...');
        let tags = await this.store.peekAll('tag');
        (0, _chai.expect)(tags.length).to.equal(5);
        let removeBtns = (0, _testHelpers.findAll)('.ember-power-select-multiple-remove-btn');
        await (0, _testHelpers.click)(removeBtns[removeBtns.length - 1]);
        tags = await this.store.peekAll('tag');
        (0, _chai.expect)(tags.length).to.equal(4);
      });
    });
    (0, _mocha.describe)('createTag', function () {
      (0, _mocha.it)('creates new records', async function () {
        await assignPostWithTags(this, 'two', 'three');
        await (0, _testHelpers.render)(Ember.HTMLBars.template(
        /*
          {{gh-psm-tags-input post=post}}
        */
        {
          "id": "lc1mhq6Y",
          "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,1],null,[[\"post\"],[[35,0]]]]]],\"hasEval\":false,\"upvars\":[\"post\",\"gh-psm-tags-input\"]}",
          "moduleName": "(unknown template module)"
        }));
        await (0, _helpers.clickTrigger)();
        await (0, _helpers.typeInSearch)('New One');
        await (0, _testHelpers.settled)();
        await (0, _helpers.selectChoose)('.ember-power-select-trigger', '.ember-power-select-option', 0);
        await (0, _helpers.typeInSearch)('New Two');
        await (0, _testHelpers.settled)();
        await (0, _helpers.selectChoose)('.ember-power-select-trigger', '.ember-power-select-option', 0);
        let tags = await this.store.peekAll('tag');
        (0, _chai.expect)(tags.length).to.equal(6);
        (0, _chai.expect)(tags.findBy('name', 'New One').isNew).to.be.true;
        (0, _chai.expect)(tags.findBy('name', 'New Two').isNew).to.be.true;
      });
    });
  });
});
define("ghost-admin/tests/integration/components/gh-psm-template-select-test", ["ghost-admin/mirage/config/themes", "mocha", "chai", "@ember/test-helpers", "ember-mocha", "ghost-admin/initializers/ember-cli-mirage"], function (_themes, _mocha, _chai, _testHelpers, _emberMocha, _emberCliMirage) {
  "use strict";

  (0, _mocha.describe)('Integration: Component: gh-psm-template-select', function () {
    (0, _emberMocha.setupRenderingTest)();
    let server;
    beforeEach(function () {
      server = (0, _emberCliMirage.startMirage)();
      server.create('theme', {
        active: true,
        name: 'example-theme',
        package: {
          name: 'Example Theme',
          version: '0.1'
        },
        templates: [{
          filename: 'custom-news-bulletin.hbs',
          name: 'News Bulletin',
          for: ['post', 'page'],
          slug: null
        }, {
          filename: 'custom-big-images.hbs',
          name: 'Big Images',
          for: ['post', 'page'],
          slug: null
        }, {
          filename: 'post-one.hbs',
          name: 'One',
          for: ['post'],
          slug: 'one'
        }, {
          filename: 'page-about.hbs',
          name: 'About',
          for: ['page'],
          slug: 'about'
        }]
      });
      (0, _themes.default)(server);
    });
    afterEach(function () {
      server.shutdown();
    });
    (0, _mocha.it)('disables template selector if slug matches post template', async function () {
      this.set('post', {
        slug: 'one',
        constructor: {
          modelName: 'post'
        }
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-psm-template-select post=post}}
      */
      {
        "id": "90f57fuh",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,1],null,[[\"post\"],[[35,0]]]]]],\"hasEval\":false,\"upvars\":[\"post\",\"gh-psm-template-select\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.find)('select').disabled, 'select is disabled').to.be.true;
      (0, _chai.expect)((0, _testHelpers.find)('p')).to.contain.text('post-one.hbs');
    });
    (0, _mocha.it)('disables template selector if slug matches page template', async function () {
      this.set('post', {
        slug: 'about',
        constructor: {
          modelName: 'page'
        }
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-psm-template-select post=post}}
      */
      {
        "id": "90f57fuh",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,1],null,[[\"post\"],[[35,0]]]]]],\"hasEval\":false,\"upvars\":[\"post\",\"gh-psm-template-select\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.find)('select').disabled, 'select is disabled').to.be.true;
      (0, _chai.expect)((0, _testHelpers.find)('p')).to.contain.text('page-about.hbs');
    });
  });
});
define("ghost-admin/tests/integration/components/gh-psm-visibility-input-test", ["sinon", "@ember/test-helpers", "mocha", "chai", "ember-mocha"], function (_sinon, _testHelpers, _mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Integration: Component: gh-psm-visibility-input', function () {
    (0, _emberMocha.setupRenderingTest)();
    (0, _mocha.it)('renders', async function () {
      this.set('post', {
        visibility: 'members'
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-psm-visibility-input post=post}}
      */
      {
        "id": "UXt6Ndbp",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,1],null,[[\"post\"],[[35,0]]]]]],\"hasEval\":false,\"upvars\":[\"post\",\"gh-psm-visibility-input\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)(this.element, 'top-level elements').to.exist;
      (0, _chai.expect)((0, _testHelpers.findAll)('option'), 'number of options').to.have.length(4);
      (0, _chai.expect)((0, _testHelpers.find)('select').value, 'selected option value').to.equal('members');
    });
    (0, _mocha.it)('updates post visibility on change', async function () {
      let setVisibility = _sinon.default.spy();

      this.set('post', {
        visibility: 'public',
        set: setVisibility
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-psm-visibility-input post=post}}
      */
      {
        "id": "UXt6Ndbp",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,1],null,[[\"post\"],[[35,0]]]]]],\"hasEval\":false,\"upvars\":[\"post\",\"gh-psm-visibility-input\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)(this.element, 'top-level elements').to.exist;
      (0, _chai.expect)((0, _testHelpers.findAll)('option'), 'number of options').to.have.length(4);
      (0, _chai.expect)((0, _testHelpers.find)('select').value, 'selected option value').to.equal('public');
      await (0, _testHelpers.fillIn)('select', 'paid');
      await (0, _testHelpers.blur)('select');
      (0, _chai.expect)(setVisibility.calledTwice).to.be.true;
      (0, _chai.expect)(setVisibility.calledWith('visibility', 'paid')).to.be.true;
      (0, _chai.expect)(setVisibility.calledWith('tiers', [])).to.be.true;
    });
  });
});
define("ghost-admin/tests/integration/components/gh-search-input-test", ["pretender", "mocha", "chai", "@ember/test-helpers", "ember-mocha"], function (_pretender, _mocha, _chai, _testHelpers, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Integration: Component: gh-search-input', function () {
    (0, _emberMocha.setupRenderingTest)();
    let server;
    beforeEach(function () {
      server = new _pretender.default();
    });
    afterEach(function () {
      server.shutdown();
    });
    (0, _mocha.it)('renders', async function () {
      // renders the component on the page
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-search-input}}
      */
      {
        "id": "mvERPCmV",
        "block": "{\"symbols\":[],\"statements\":[[1,[34,0]]],\"hasEval\":false,\"upvars\":[\"gh-search-input\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.find)('.ember-power-select-search input')).to.exist;
    });
    (0, _mocha.it)('opens the dropdown on text entry', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-search-input}}
      */
      {
        "id": "mvERPCmV",
        "block": "{\"symbols\":[],\"statements\":[[1,[34,0]]],\"hasEval\":false,\"upvars\":[\"gh-search-input\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _testHelpers.fillIn)('input[type="search"]', 'test');
      (0, _chai.expect)((0, _testHelpers.findAll)('.ember-basic-dropdown-content').length).to.equal(1);
    });
  });
});
define("ghost-admin/tests/integration/components/gh-tag-settings-form-test", ["ember-data", "@ember/test-helpers", "mocha", "chai", "ember-mocha"], function (_emberData, _testHelpers, _mocha, _chai, _emberMocha) {
  "use strict";

  // TODO: remove usage of Ember Data's private `Errors` class when refactoring validations
  // eslint-disable-next-line
  const {
    Errors
  } = _emberData.default;
  let configStub = Ember.Service.extend({
    blogUrl: 'http://localhost:2368'
  });
  let mediaQueriesStub = Ember.Service.extend({
    maxWidth600: false
  });

  _mocha.describe.skip('Integration: Component: gh-tag-settings-form', function () {
    (0, _emberMocha.setupRenderingTest)();
    beforeEach(function () {
      /* eslint-disable camelcase */
      let tag = Ember.Object.create({
        id: 1,
        name: 'Test',
        slug: 'test',
        description: 'Description.',
        metaTitle: 'Meta Title',
        metaDescription: 'Meta description',
        errors: Errors.create(),
        hasValidated: []
      });
      /* eslint-enable camelcase */

      this.set('tag', tag);
      this.set('setProperty', function (property, value) {
        // this should be overridden if a call is expected
        // eslint-disable-next-line no-console
        console.error(`setProperty called '${property}: ${value}'`);
      });
      this.owner.register('service:config', configStub);
      this.owner.register('service:media-queries', mediaQueriesStub);
    });
    (0, _mocha.it)('has the correct title', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        
                  {{gh-tag-settings-form tag=tag setProperty=(action setProperty)}}
              
      */
      {
        "id": "jFHwMgo8",
        "block": "{\"symbols\":[],\"statements\":[[2,\"\\n            \"],[1,[30,[36,3],null,[[\"tag\",\"setProperty\"],[[35,2],[30,[36,1],[[32,0],[35,0]],null]]]]],[2,\"\\n        \"]],\"hasEval\":false,\"upvars\":[\"setProperty\",\"action\",\"tag\",\"gh-tag-settings-form\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.find)('.tag-settings-pane h4').textContent, 'existing tag title').to.equal('Tag settings');
      this.set('tag.isNew', true);
      (0, _chai.expect)((0, _testHelpers.find)('.tag-settings-pane h4').textContent, 'new tag title').to.equal('New tag');
    });
    (0, _mocha.it)('renders main settings', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        
                  {{gh-tag-settings-form tag=tag setProperty=(action setProperty)}}
              
      */
      {
        "id": "jFHwMgo8",
        "block": "{\"symbols\":[],\"statements\":[[2,\"\\n            \"],[1,[30,[36,3],null,[[\"tag\",\"setProperty\"],[[35,2],[30,[36,1],[[32,0],[35,0]],null]]]]],[2,\"\\n        \"]],\"hasEval\":false,\"upvars\":[\"setProperty\",\"action\",\"tag\",\"gh-tag-settings-form\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.findAll)('.gh-image-uploader').length, 'displays image uploader').to.equal(1);
      (0, _chai.expect)((0, _testHelpers.find)('input[name="name"]').value, 'name field value').to.equal('Test');
      (0, _chai.expect)((0, _testHelpers.find)('input[name="slug"]').value, 'slug field value').to.equal('test');
      (0, _chai.expect)((0, _testHelpers.find)('textarea[name="description"]').value, 'description field value').to.equal('Description.');
      (0, _chai.expect)((0, _testHelpers.find)('input[name="metaTitle"]').value, 'metaTitle field value').to.equal('Meta Title');
      (0, _chai.expect)((0, _testHelpers.find)('textarea[name="metaDescription"]').value, 'metaDescription field value').to.equal('Meta description');
    });
    (0, _mocha.it)('can switch between main/meta settings', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        
                  {{gh-tag-settings-form tag=tag setProperty=(action setProperty)}}
              
      */
      {
        "id": "jFHwMgo8",
        "block": "{\"symbols\":[],\"statements\":[[2,\"\\n            \"],[1,[30,[36,3],null,[[\"tag\",\"setProperty\"],[[35,2],[30,[36,1],[[32,0],[35,0]],null]]]]],[2,\"\\n        \"]],\"hasEval\":false,\"upvars\":[\"setProperty\",\"action\",\"tag\",\"gh-tag-settings-form\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.find)('.tag-settings-pane').classList.contains('settings-menu-pane-in'), 'main settings are displayed by default').to.be.true;
      (0, _chai.expect)((0, _testHelpers.find)('.tag-meta-settings-pane').classList.contains('settings-menu-pane-out-right'), 'meta settings are hidden by default').to.be.true;
      await (0, _testHelpers.click)('.meta-data-button');
      (0, _chai.expect)((0, _testHelpers.find)('.tag-settings-pane').classList.contains('settings-menu-pane-out-left'), 'main settings are hidden after clicking Meta Data button').to.be.true;
      (0, _chai.expect)((0, _testHelpers.find)('.tag-meta-settings-pane').classList.contains('settings-menu-pane-in'), 'meta settings are displayed after clicking Meta Data button').to.be.true;
      await (0, _testHelpers.click)('.back');
      (0, _chai.expect)((0, _testHelpers.find)('.tag-settings-pane').classList.contains('settings-menu-pane-in'), 'main settings are displayed after clicking "back"').to.be.true;
      (0, _chai.expect)((0, _testHelpers.find)('.tag-meta-settings-pane').classList.contains('settings-menu-pane-out-right'), 'meta settings are hidden after clicking "back"').to.be.true;
    });
    (0, _mocha.it)('has one-way binding for properties', async function () {
      this.set('setProperty', function () {// noop
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        
                  {{gh-tag-settings-form tag=tag setProperty=(action setProperty)}}
              
      */
      {
        "id": "jFHwMgo8",
        "block": "{\"symbols\":[],\"statements\":[[2,\"\\n            \"],[1,[30,[36,3],null,[[\"tag\",\"setProperty\"],[[35,2],[30,[36,1],[[32,0],[35,0]],null]]]]],[2,\"\\n        \"]],\"hasEval\":false,\"upvars\":[\"setProperty\",\"action\",\"tag\",\"gh-tag-settings-form\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _testHelpers.fillIn)('input[name="name"]', 'New name');
      await (0, _testHelpers.fillIn)('input[name="slug"]', 'new-slug');
      await (0, _testHelpers.fillIn)('textarea[name="description"]', 'New description');
      await (0, _testHelpers.fillIn)('input[name="metaTitle"]', 'New metaTitle');
      await (0, _testHelpers.fillIn)('textarea[name="metaDescription"]', 'New metaDescription');
      (0, _chai.expect)(this.get('tag.name'), 'tag name').to.equal('Test');
      (0, _chai.expect)(this.get('tag.slug'), 'tag slug').to.equal('test');
      (0, _chai.expect)(this.get('tag.description'), 'tag description').to.equal('Description.');
      (0, _chai.expect)(this.get('tag.metaTitle'), 'tag metaTitle').to.equal('Meta Title');
      (0, _chai.expect)(this.get('tag.metaDescription'), 'tag metaDescription').to.equal('Meta description');
    });
    (0, _mocha.it)('triggers setProperty action on blur of all fields', async function () {
      let lastSeenProperty = '';
      let lastSeenValue = '';
      this.set('setProperty', function (property, value) {
        lastSeenProperty = property;
        lastSeenValue = value;
      });

      let testSetProperty = async (selector, expectedProperty, expectedValue) => {
        await (0, _testHelpers.click)(selector);
        await (0, _testHelpers.fillIn)(selector, expectedValue);
        await (0, _testHelpers.blur)(selector);
        (0, _chai.expect)(lastSeenProperty, 'property').to.equal(expectedProperty);
        (0, _chai.expect)(lastSeenValue, 'value').to.equal(expectedValue);
      };

      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        
                  {{gh-tag-settings-form tag=tag setProperty=(action setProperty)}}
              
      */
      {
        "id": "jFHwMgo8",
        "block": "{\"symbols\":[],\"statements\":[[2,\"\\n            \"],[1,[30,[36,3],null,[[\"tag\",\"setProperty\"],[[35,2],[30,[36,1],[[32,0],[35,0]],null]]]]],[2,\"\\n        \"]],\"hasEval\":false,\"upvars\":[\"setProperty\",\"action\",\"tag\",\"gh-tag-settings-form\"]}",
        "moduleName": "(unknown template module)"
      }));
      await testSetProperty('input[name="name"]', 'name', 'New name');
      await testSetProperty('input[name="slug"]', 'slug', 'new-slug');
      await testSetProperty('textarea[name="description"]', 'description', 'New description');
      await testSetProperty('input[name="metaTitle"]', 'metaTitle', 'New metaTitle');
      await testSetProperty('textarea[name="metaDescription"]', 'metaDescription', 'New metaDescription');
    });
    (0, _mocha.it)('displays error messages for validated fields', async function () {
      let errors = this.get('tag.errors');
      let hasValidated = this.get('tag.hasValidated');
      errors.add('name', 'must be present');
      hasValidated.push('name');
      errors.add('slug', 'must be present');
      hasValidated.push('slug');
      errors.add('description', 'is too long');
      hasValidated.push('description');
      errors.add('metaTitle', 'is too long');
      hasValidated.push('metaTitle');
      errors.add('metaDescription', 'is too long');
      hasValidated.push('metaDescription');
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        
                  {{gh-tag-settings-form tag=tag setProperty=(action setProperty)}}
              
      */
      {
        "id": "jFHwMgo8",
        "block": "{\"symbols\":[],\"statements\":[[2,\"\\n            \"],[1,[30,[36,3],null,[[\"tag\",\"setProperty\"],[[35,2],[30,[36,1],[[32,0],[35,0]],null]]]]],[2,\"\\n        \"]],\"hasEval\":false,\"upvars\":[\"setProperty\",\"action\",\"tag\",\"gh-tag-settings-form\"]}",
        "moduleName": "(unknown template module)"
      }));
      let nameFormGroup = (0, _testHelpers.find)('input[name="name"]').closest('.form-group');
      (0, _chai.expect)(nameFormGroup, 'name form group has error state').to.have.class('error');
      (0, _chai.expect)(nameFormGroup.querySelector('.response'), 'name form group has error message').to.exist;
      let slugFormGroup = (0, _testHelpers.find)('input[name="slug"]').closest('.form-group');
      (0, _chai.expect)(slugFormGroup, 'slug form group has error state').to.have.class('error');
      (0, _chai.expect)(slugFormGroup.querySelector('.response'), 'slug form group has error message').to.exist;
      let descriptionFormGroup = (0, _testHelpers.find)('textarea[name="description"]').closest('.form-group');
      (0, _chai.expect)(descriptionFormGroup, 'description form group has error state').to.have.class('error');
      let metaTitleFormGroup = (0, _testHelpers.find)('input[name="metaTitle"]').closest('.form-group');
      (0, _chai.expect)(metaTitleFormGroup, 'metaTitle form group has error state').to.have.class('error');
      (0, _chai.expect)(metaTitleFormGroup.querySelector('.response'), 'metaTitle form group has error message').to.exist;
      let metaDescriptionFormGroup = (0, _testHelpers.find)('textarea[name="metaDescription"]').closest('.form-group');
      (0, _chai.expect)(metaDescriptionFormGroup, 'metaDescription form group has error state').to.have.class('error');
      (0, _chai.expect)(metaDescriptionFormGroup.querySelector('.response'), 'metaDescription form group has error message').to.exist;
    });
    (0, _mocha.it)('displays char count for text fields', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        
                  {{gh-tag-settings-form tag=tag setProperty=(action setProperty)}}
              
      */
      {
        "id": "jFHwMgo8",
        "block": "{\"symbols\":[],\"statements\":[[2,\"\\n            \"],[1,[30,[36,3],null,[[\"tag\",\"setProperty\"],[[35,2],[30,[36,1],[[32,0],[35,0]],null]]]]],[2,\"\\n        \"]],\"hasEval\":false,\"upvars\":[\"setProperty\",\"action\",\"tag\",\"gh-tag-settings-form\"]}",
        "moduleName": "(unknown template module)"
      }));
      let descriptionFormGroup = (0, _testHelpers.find)('textarea[name="description"]').closest('.form-group');
      (0, _chai.expect)(descriptionFormGroup.querySelector('.word-count'), 'description char count').to.have.trimmed.text('12');
      let metaDescriptionFormGroup = (0, _testHelpers.find)('textarea[name="metaDescription"]').closest('.form-group');
      (0, _chai.expect)(metaDescriptionFormGroup.querySelector('.word-count'), 'description char count').to.have.trimmed.text('16');
    });
    (0, _mocha.it)('renders SEO title preview', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        
                  {{gh-tag-settings-form tag=tag setProperty=(action setProperty)}}
              
      */
      {
        "id": "jFHwMgo8",
        "block": "{\"symbols\":[],\"statements\":[[2,\"\\n            \"],[1,[30,[36,3],null,[[\"tag\",\"setProperty\"],[[35,2],[30,[36,1],[[32,0],[35,0]],null]]]]],[2,\"\\n        \"]],\"hasEval\":false,\"upvars\":[\"setProperty\",\"action\",\"tag\",\"gh-tag-settings-form\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.find)('.seo-preview-title').textContent, 'displays meta title if present').to.equal('Meta Title');
      this.set('tag.metaTitle', '');
      (0, _chai.expect)((0, _testHelpers.find)('.seo-preview-title').textContent, 'falls back to tag name without metaTitle').to.equal('Test');
      this.set('tag.name', new Array(151).join('x'));
      let expectedLength = 70 + '…'.length;
      (0, _chai.expect)((0, _testHelpers.find)('.seo-preview-title').textContent.length, 'cuts title to max 70 chars').to.equal(expectedLength);
    });
    (0, _mocha.it)('renders SEO URL preview', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        
                  {{gh-tag-settings-form tag=tag setProperty=(action setProperty)}}
              
      */
      {
        "id": "jFHwMgo8",
        "block": "{\"symbols\":[],\"statements\":[[2,\"\\n            \"],[1,[30,[36,3],null,[[\"tag\",\"setProperty\"],[[35,2],[30,[36,1],[[32,0],[35,0]],null]]]]],[2,\"\\n        \"]],\"hasEval\":false,\"upvars\":[\"setProperty\",\"action\",\"tag\",\"gh-tag-settings-form\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.find)('.seo-preview-link').textContent, 'adds url and tag prefix').to.equal('http://localhost:2368/tag/test/');
      this.set('tag.slug', new Array(151).join('x'));
      let expectedLength = 70 + '…'.length;
      (0, _chai.expect)((0, _testHelpers.find)('.seo-preview-link').textContent.length, 'cuts slug to max 70 chars').to.equal(expectedLength);
    });
    (0, _mocha.it)('renders SEO description preview', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        
                  {{gh-tag-settings-form tag=tag setProperty=(action setProperty)}}
              
      */
      {
        "id": "jFHwMgo8",
        "block": "{\"symbols\":[],\"statements\":[[2,\"\\n            \"],[1,[30,[36,3],null,[[\"tag\",\"setProperty\"],[[35,2],[30,[36,1],[[32,0],[35,0]],null]]]]],[2,\"\\n        \"]],\"hasEval\":false,\"upvars\":[\"setProperty\",\"action\",\"tag\",\"gh-tag-settings-form\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.find)('.seo-preview-description').textContent, 'displays meta description if present').to.equal('Meta description');
      this.set('tag.metaDescription', '');
      (0, _chai.expect)((0, _testHelpers.find)('.seo-preview-description').textContent, 'falls back to tag description without metaDescription').to.equal('Description.');
      this.set('tag.description', new Array(500).join('x'));
      let expectedLength = 156 + '…'.length;
      (0, _chai.expect)((0, _testHelpers.find)('.seo-preview-description').textContent.length, 'cuts description to max 156 chars').to.equal(expectedLength);
    });
    (0, _mocha.it)('resets if a new tag is received', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        
                  {{gh-tag-settings-form tag=tag setProperty=(action setProperty)}}
              
      */
      {
        "id": "jFHwMgo8",
        "block": "{\"symbols\":[],\"statements\":[[2,\"\\n            \"],[1,[30,[36,3],null,[[\"tag\",\"setProperty\"],[[35,2],[30,[36,1],[[32,0],[35,0]],null]]]]],[2,\"\\n        \"]],\"hasEval\":false,\"upvars\":[\"setProperty\",\"action\",\"tag\",\"gh-tag-settings-form\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _testHelpers.click)('.meta-data-button');
      (0, _chai.expect)((0, _testHelpers.find)('.tag-meta-settings-pane').classList.contains('settings-menu-pane-in'), 'meta data pane is shown').to.be.true;
      this.set('tag', Ember.Object.create({
        id: '2'
      }));
      (0, _chai.expect)((0, _testHelpers.find)('.tag-settings-pane').classList.contains('settings-menu-pane-in'), 'resets to main settings').to.be.true;
    });
    (0, _mocha.it)('triggers delete tag modal on delete click', async function () {
      let openModalFired = false;
      this.set('openModal', () => {
        openModalFired = true;
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        
                  {{gh-tag-settings-form tag=tag setProperty=(action setProperty) showDeleteTagModal=(action openModal)}}
              
      */
      {
        "id": "e34cNwzi",
        "block": "{\"symbols\":[],\"statements\":[[2,\"\\n            \"],[1,[30,[36,4],null,[[\"tag\",\"setProperty\",\"showDeleteTagModal\"],[[35,3],[30,[36,1],[[32,0],[35,2]],null],[30,[36,1],[[32,0],[35,0]],null]]]]],[2,\"\\n        \"]],\"hasEval\":false,\"upvars\":[\"openModal\",\"action\",\"setProperty\",\"tag\",\"gh-tag-settings-form\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _testHelpers.click)('.settings-menu-delete-button');
      (0, _chai.expect)(openModalFired).to.be.true;
    });
    (0, _mocha.it)('shows tags arrow link on mobile', async function () {
      let mediaQueries = this.owner.lookup('service:media-queries');
      mediaQueries.set('maxWidth600', true);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        
                  {{gh-tag-settings-form tag=tag setProperty=(action setProperty)}}
              
      */
      {
        "id": "jFHwMgo8",
        "block": "{\"symbols\":[],\"statements\":[[2,\"\\n            \"],[1,[30,[36,3],null,[[\"tag\",\"setProperty\"],[[35,2],[30,[36,1],[[32,0],[35,0]],null]]]]],[2,\"\\n        \"]],\"hasEval\":false,\"upvars\":[\"setProperty\",\"action\",\"tag\",\"gh-tag-settings-form\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.findAll)('.tag-settings-pane .settings-menu-header .settings-menu-header-action').length, 'tags link is shown').to.equal(1);
    });
  });
});
define("ghost-admin/tests/integration/components/gh-task-button-test", ["@ember/test-helpers", "mocha", "chai", "ember-mocha", "ember-concurrency"], function (_testHelpers, _mocha, _chai, _emberMocha, _emberConcurrency) {
  "use strict";

  (0, _mocha.describe)('Integration: Component: gh-task-button', function () {
    (0, _emberMocha.setupRenderingTest)();
    (0, _mocha.it)('renders', async function () {
      // sets button text using positional param
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhTaskButton @buttonText="Test" />
      */
      {
        "id": "FfPPV/td",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-task-button\",[],[[\"@buttonText\"],[\"Test\"]],null]],\"hasEval\":false,\"upvars\":[]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.find)('button')).to.exist;
      (0, _chai.expect)((0, _testHelpers.find)('button')).to.contain.text('Test');
      (0, _chai.expect)((0, _testHelpers.find)('button').disabled).to.be.false;
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhTaskButton @class="testing" />
      */
      {
        "id": "Z0kpFMUS",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-task-button\",[],[[\"@class\"],[\"testing\"]],null]],\"hasEval\":false,\"upvars\":[]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.find)('button')).to.have.class('testing'); // default button text is "Save"

      (0, _chai.expect)((0, _testHelpers.find)('button')).to.contain.text('Save'); // passes disabled attr

      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhTaskButton @disabled={{true}} @buttonText="Test" />
      */
      {
        "id": "0AREPlq5",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-task-button\",[],[[\"@disabled\",\"@buttonText\"],[true,\"Test\"]],null]],\"hasEval\":false,\"upvars\":[]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.find)('button').disabled).to.be.true; // allows button text to be set via hash param

      (0, _chai.expect)((0, _testHelpers.find)('button')).to.contain.text('Test'); // passes type attr

      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhTaskButton @type="submit" />
      */
      {
        "id": "aZoSOF4e",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-task-button\",[],[[\"@type\"],[\"submit\"]],null]],\"hasEval\":false,\"upvars\":[]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.find)('button')).to.have.attr('type', 'submit'); // passes tabindex attr

      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhTaskButton @tabindex="-1" />
      */
      {
        "id": "rHlnB2DL",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-task-button\",[],[[\"@tabindex\"],[\"-1\"]],null]],\"hasEval\":false,\"upvars\":[]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.find)('button')).to.have.attr('tabindex', '-1');
    });
    (0, _mocha.it)('shows spinner whilst running', async function () {
      Ember.defineProperty(this, 'myTask', (0, _emberConcurrency.task)(function* () {
        yield (0, _emberConcurrency.timeout)(50);
      }));
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhTaskButton @task={{myTask}} />
      */
      {
        "id": "Gvf7yyL4",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-task-button\",[],[[\"@task\"],[[34,0]]],null]],\"hasEval\":false,\"upvars\":[\"myTask\"]}",
        "moduleName": "(unknown template module)"
      }));
      this.myTask.perform();
      await (0, _testHelpers.waitFor)('button svg', {
        timeout: 50
      });
      await (0, _testHelpers.settled)();
    });
    (0, _mocha.it)('shows running text when passed whilst running', async function () {
      Ember.defineProperty(this, 'myTask', (0, _emberConcurrency.task)(function* () {
        yield (0, _emberConcurrency.timeout)(50);
      }));
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhTaskButton @task={{myTask}} @runningText="Running" />
      */
      {
        "id": "xSOpqdvB",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-task-button\",[],[[\"@task\",\"@runningText\"],[[34,0],\"Running\"]],null]],\"hasEval\":false,\"upvars\":[\"myTask\"]}",
        "moduleName": "(unknown template module)"
      }));
      this.myTask.perform();
      await (0, _testHelpers.waitFor)('button svg', {
        timeout: 50
      });
      (0, _chai.expect)((0, _testHelpers.find)('button')).to.contain.text('Running');
      await (0, _testHelpers.settled)();
    });
    (0, _mocha.it)('appears disabled whilst running', async function () {
      Ember.defineProperty(this, 'myTask', (0, _emberConcurrency.task)(function* () {
        yield (0, _emberConcurrency.timeout)(50);
      }));
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhTaskButton @task={{myTask}} />
      */
      {
        "id": "Gvf7yyL4",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-task-button\",[],[[\"@task\"],[[34,0]]],null]],\"hasEval\":false,\"upvars\":[\"myTask\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.find)('button'), 'initial class').to.not.have.class('appear-disabled');
      this.myTask.perform();
      await (0, _testHelpers.waitFor)('button.appear-disabled', {
        timeout: 100
      });
      await (0, _testHelpers.settled)();
      (0, _chai.expect)((0, _testHelpers.find)('button'), 'ended class').to.not.have.class('appear-disabled');
    });
    (0, _mocha.it)('shows success on success', async function () {
      Ember.defineProperty(this, 'myTask', (0, _emberConcurrency.task)(function* () {
        yield (0, _emberConcurrency.timeout)(50);
        return true;
      }));
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhTaskButton @task={{myTask}} />
      */
      {
        "id": "Gvf7yyL4",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-task-button\",[],[[\"@task\"],[[34,0]]],null]],\"hasEval\":false,\"upvars\":[\"myTask\"]}",
        "moduleName": "(unknown template module)"
      }));
      await this.myTask.perform();
      (0, _chai.expect)((0, _testHelpers.find)('button')).to.have.class('gh-btn-green');
      (0, _chai.expect)((0, _testHelpers.find)('button')).to.contain.text('Saved');
    });
    (0, _mocha.it)('assigns specified success class on success', async function () {
      Ember.defineProperty(this, 'myTask', (0, _emberConcurrency.task)(function* () {
        yield (0, _emberConcurrency.timeout)(50);
        return true;
      }));
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhTaskButton @task={{myTask}} @successClass="im-a-success" />
      */
      {
        "id": "VAmQwndJ",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-task-button\",[],[[\"@task\",\"@successClass\"],[[34,0],\"im-a-success\"]],null]],\"hasEval\":false,\"upvars\":[\"myTask\"]}",
        "moduleName": "(unknown template module)"
      }));
      await this.myTask.perform();
      (0, _chai.expect)((0, _testHelpers.find)('button')).to.not.have.class('gh-btn-green');
      (0, _chai.expect)((0, _testHelpers.find)('button')).to.have.class('im-a-success');
      (0, _chai.expect)((0, _testHelpers.find)('button')).to.contain.text('Saved');
    });
    (0, _mocha.it)('shows failure when task errors', async function () {
      Ember.defineProperty(this, 'myTask', (0, _emberConcurrency.task)(function* () {
        try {
          yield (0, _emberConcurrency.timeout)(50);
          throw new ReferenceError('test error');
        } catch (error) {// noop, prevent mocha triggering unhandled error assert
        }
      }));
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhTaskButton @task={{myTask}} @failureClass="is-failed" />
      */
      {
        "id": "uZqUTtWF",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-task-button\",[],[[\"@task\",\"@failureClass\"],[[34,0],\"is-failed\"]],null]],\"hasEval\":false,\"upvars\":[\"myTask\"]}",
        "moduleName": "(unknown template module)"
      }));
      this.myTask.perform();
      await (0, _testHelpers.waitFor)('button.is-failed');
      (0, _chai.expect)((0, _testHelpers.find)('button')).to.contain.text('Retry');
      await (0, _testHelpers.settled)();
    });
    (0, _mocha.it)('shows failure on falsy response', async function () {
      Ember.defineProperty(this, 'myTask', (0, _emberConcurrency.task)(function* () {
        yield (0, _emberConcurrency.timeout)(50);
        return false;
      }));
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhTaskButton @task={{myTask}} />
      */
      {
        "id": "Gvf7yyL4",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-task-button\",[],[[\"@task\"],[[34,0]]],null]],\"hasEval\":false,\"upvars\":[\"myTask\"]}",
        "moduleName": "(unknown template module)"
      }));
      this.myTask.perform();
      await (0, _testHelpers.waitFor)('button.gh-btn-red', {
        timeout: 50
      });
      (0, _chai.expect)((0, _testHelpers.find)('button')).to.contain.text('Retry');
      await (0, _testHelpers.settled)();
    });
    (0, _mocha.it)('shows idle on canceled response', async function () {
      Ember.defineProperty(this, 'myTask', (0, _emberConcurrency.task)(function* () {
        yield (0, _emberConcurrency.timeout)(50);
        return 'canceled';
      }));
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhTaskButton @task={{myTask}} />
      */
      {
        "id": "Gvf7yyL4",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-task-button\",[],[[\"@task\"],[[34,0]]],null]],\"hasEval\":false,\"upvars\":[\"myTask\"]}",
        "moduleName": "(unknown template module)"
      }));
      this.myTask.perform();
      await (0, _testHelpers.waitFor)('[data-test-task-button-state="idle"]', {
        timeout: 50
      });
      await (0, _testHelpers.settled)();
    });
    (0, _mocha.it)('assigns specified failure class on failure', async function () {
      Ember.defineProperty(this, 'myTask', (0, _emberConcurrency.task)(function* () {
        yield (0, _emberConcurrency.timeout)(50);
        return false;
      }));
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhTaskButton @task={{myTask}} @failureClass="im-a-failure" />
      */
      {
        "id": "oEVhXXpQ",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-task-button\",[],[[\"@task\",\"@failureClass\"],[[34,0],\"im-a-failure\"]],null]],\"hasEval\":false,\"upvars\":[\"myTask\"]}",
        "moduleName": "(unknown template module)"
      }));
      this.myTask.perform();
      await (0, _testHelpers.waitFor)('button.im-a-failure', {
        timeout: 50
      });
      (0, _chai.expect)((0, _testHelpers.find)('button')).to.not.have.class('gh-btn-red');
      (0, _chai.expect)((0, _testHelpers.find)('button')).to.contain.text('Retry');
      await (0, _testHelpers.settled)();
    });
    (0, _mocha.it)('performs task on click', async function () {
      let taskCount = 0;
      Ember.defineProperty(this, 'myTask', (0, _emberConcurrency.task)(function* () {
        yield (0, _emberConcurrency.timeout)(50);
        taskCount = taskCount + 1;
      }));
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhTaskButton @task={{myTask}} />
      */
      {
        "id": "Gvf7yyL4",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-task-button\",[],[[\"@task\"],[[34,0]]],null]],\"hasEval\":false,\"upvars\":[\"myTask\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _testHelpers.click)('button');
      (0, _chai.expect)(taskCount, 'taskCount').to.equal(1);
    });

    _mocha.it.skip('keeps button size when showing spinner', async function () {
      Ember.defineProperty(this, 'myTask', (0, _emberConcurrency.task)(function* () {
        yield (0, _emberConcurrency.timeout)(50);
      }));
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhTaskButton @task={{myTask}} />
      */
      {
        "id": "Gvf7yyL4",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-task-button\",[],[[\"@task\"],[[34,0]]],null]],\"hasEval\":false,\"upvars\":[\"myTask\"]}",
        "moduleName": "(unknown template module)"
      }));
      let width = (0, _testHelpers.find)('button').clientWidth;
      let height = (0, _testHelpers.find)('button').clientHeight;
      (0, _chai.expect)((0, _testHelpers.find)('button')).to.not.have.attr('style');
      this.myTask.perform();
      Ember.run.later(this, function () {
        // we can't test exact width/height because Chrome/Firefox use different rounding methods
        // expect(find('button')).to.have.attr('style', `width: ${width}px; height: ${height}px;`);
        let [widthInt] = width.toString().split('.');
        let [heightInt] = height.toString().split('.');
        (0, _chai.expect)((0, _testHelpers.find)('button')).to.have.attr('style', `width: ${widthInt}`);
        (0, _chai.expect)((0, _testHelpers.find)('button')).to.have.attr('style', `height: ${heightInt}`);
      }, 20);
      Ember.run.later(this, function () {
        (0, _chai.expect)((0, _testHelpers.find)('button').getAttribute('style')).to.be.empty;
      }, 100);
      await (0, _testHelpers.settled)();
    });
  });
});
define("ghost-admin/tests/integration/components/gh-theme-table-test", ["@ember/test-helpers", "mocha", "chai", "ember-mocha"], function (_testHelpers, _mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Integration: Component: gh-theme-table', function () {
    (0, _emberMocha.setupRenderingTest)();
    (0, _mocha.it)('renders', async function () {
      this.set('themes', [{
        name: 'Daring',
        package: {
          name: 'Daring',
          version: '0.1.4'
        },
        active: true
      }, {
        name: 'casper',
        package: {
          name: 'Casper',
          version: '1.3.1'
        }
      }, {
        name: 'oscar-ghost-1.1.0',
        package: {
          name: 'Lanyon',
          version: '1.1.0'
        }
      }, {
        name: 'foo'
      }]);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhThemeTable @themes={{themes}} />
      */
      {
        "id": "xqA/125V",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-theme-table\",[],[[\"@themes\"],[[34,0]]],null]],\"hasEval\":false,\"upvars\":[\"themes\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-themes-list]').length, 'themes list is present').to.equal(1);
      (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-theme-id]').length, 'number of rows').to.equal(4);
      let packageNames = (0, _testHelpers.findAll)('[data-test-theme-title]').map(name => name.textContent.trim());
      (0, _chai.expect)(packageNames[0]).to.match(/Casper \(default\)/);
      (0, _chai.expect)(packageNames[1]).to.match(/Daring\s+Active/);
      (0, _chai.expect)(packageNames[2]).to.match(/foo/);
      (0, _chai.expect)(packageNames[3]).to.match(/Lanyon/);
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-theme-active="true"]').querySelector('[data-test-theme-title]'), 'active theme is highlighted').to.contain.text('Daring');
      (0, _chai.expect)((0, _testHelpers.findAll)('[data-test-button="activate"]').length, 'non-active themes have an activate link').to.equal(3);
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-theme-active="true"]').querySelector('[data-test-button="activate"]'), 'active theme doesn\'t have an activate link').to.not.exist;
    });
    (0, _mocha.it)('has download button in actions dropdown for all themes', async function () {
      const themes = [{
        name: 'Daring',
        package: {
          name: 'Daring',
          version: '0.1.4'
        },
        active: true
      }, {
        name: 'casper',
        package: {
          name: 'Casper',
          version: '1.3.1'
        }
      }, {
        name: 'oscar-ghost-1.1.0',
        package: {
          name: 'Lanyon',
          version: '1.1.0'
        }
      }, {
        name: 'foo'
      }];
      this.set('themes', themes);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhThemeTable @themes={{themes}} />
      */
      {
        "id": "xqA/125V",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-theme-table\",[],[[\"@themes\"],[[34,0]]],null]],\"hasEval\":false,\"upvars\":[\"themes\"]}",
        "moduleName": "(unknown template module)"
      }));

      for (const theme of themes) {
        await (0, _testHelpers.click)(`[data-test-theme-id="${theme.name}"] [data-test-button="actions"]`);
        (0, _chai.expect)((0, _testHelpers.find)(`[data-test-actions-for="${theme.name}"] [data-test-button="download"]`)).to.exist;
      }
    });
    (0, _mocha.it)('has delete button for non-active, non-default, themes', async function () {
      const themes = [{
        name: 'Daring',
        package: {
          name: 'Daring',
          version: '0.1.4'
        }
      }, {
        name: 'oscar-ghost-1.1.0',
        package: {
          name: 'Lanyon',
          version: '1.1.0'
        }
      }, {
        name: 'foo'
      }];
      this.set('themes', themes);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhThemeTable @themes={{themes}} />
      */
      {
        "id": "xqA/125V",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-theme-table\",[],[[\"@themes\"],[[34,0]]],null]],\"hasEval\":false,\"upvars\":[\"themes\"]}",
        "moduleName": "(unknown template module)"
      }));

      for (const theme of themes) {
        await (0, _testHelpers.click)(`[data-test-theme-id="${theme.name}"] [data-test-button="actions"]`);
        (0, _chai.expect)((0, _testHelpers.find)(`[data-test-actions-for="${theme.name}"] [data-test-button="delete"]`)).to.exist;
      }
    });
    (0, _mocha.it)('does not show delete action for casper', async function () {
      const themes = [{
        name: 'Daring',
        package: {
          name: 'Daring',
          version: '0.1.4'
        },
        active: true
      }, {
        name: 'casper',
        package: {
          name: 'Casper',
          version: '1.3.1'
        }
      }, {
        name: 'oscar-ghost-1.1.0',
        package: {
          name: 'Lanyon',
          version: '1.1.0'
        }
      }, {
        name: 'foo'
      }];
      this.set('themes', themes);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhThemeTable @themes={{themes}} />
      */
      {
        "id": "xqA/125V",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-theme-table\",[],[[\"@themes\"],[[34,0]]],null]],\"hasEval\":false,\"upvars\":[\"themes\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _testHelpers.click)(`[data-test-theme-id="casper"] [data-test-button="actions"]`);
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-actions-for="casper"]')).to.exist;
      (0, _chai.expect)((0, _testHelpers.find)(`[data-test-actions-for="casper"] [data-test-button="delete"]`)).to.not.exist;
    });
    (0, _mocha.it)('does not show delete action for active theme', async function () {
      const themes = [{
        name: 'Daring',
        package: {
          name: 'Daring',
          version: '0.1.4'
        },
        active: true
      }, {
        name: 'casper',
        package: {
          name: 'Casper',
          version: '1.3.1'
        }
      }, {
        name: 'oscar-ghost-1.1.0',
        package: {
          name: 'Lanyon',
          version: '1.1.0'
        }
      }, {
        name: 'foo'
      }];
      this.set('themes', themes);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhThemeTable @themes={{themes}} />
      */
      {
        "id": "xqA/125V",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-theme-table\",[],[[\"@themes\"],[[34,0]]],null]],\"hasEval\":false,\"upvars\":[\"themes\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _testHelpers.click)(`[data-test-theme-id="Daring"] [data-test-button="actions"]`);
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-actions-for="Daring"]')).to.exist;
      (0, _chai.expect)((0, _testHelpers.find)(`[data-test-actions-for="Daring"] [data-test-button="delete"]`)).to.not.exist;
    });
    (0, _mocha.it)('displays folder names if there are duplicate package names', async function () {
      this.set('themes', [{
        name: 'daring',
        package: {
          name: 'Daring',
          version: '0.1.4'
        }
      }, {
        name: 'daring-0.1.5',
        package: {
          name: 'Daring',
          version: '0.1.4'
        }
      }, {
        name: 'casper',
        package: {
          name: 'Casper',
          version: '1.3.1'
        }
      }, {
        name: 'another',
        package: {
          name: 'Casper',
          version: '1.3.1'
        }
      }, {
        name: 'mine',
        package: {
          name: 'Casper',
          version: '1.3.1'
        }
      }, {
        name: 'foo'
      }]);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhThemeTable @themes={{themes}} />
      */
      {
        "id": "xqA/125V",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-theme-table\",[],[[\"@themes\"],[[34,0]]],null]],\"hasEval\":false,\"upvars\":[\"themes\"]}",
        "moduleName": "(unknown template module)"
      }));
      let packageNames = (0, _testHelpers.findAll)('[data-test-theme-title]').map(name => name.textContent.trim());
      (0, _chai.expect)(packageNames, 'themes are ordered by label, folder names shown for duplicates').to.deep.equal(['Casper (another)', 'Casper (default)', 'Casper (mine)', 'Daring (daring)', 'Daring (daring-0.1.5)', 'foo']);
    });
  });
});
define("ghost-admin/tests/integration/components/gh-timezone-select-test", ["sinon", "@ember/test-helpers", "mocha", "chai", "ember-mocha"], function (_sinon, _testHelpers, _mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Integration: Component: gh-timezone-select', function () {
    (0, _emberMocha.setupRenderingTest)();
    beforeEach(function () {
      this.set('availableTimezones', [{
        name: 'Pacific/Pago_Pago',
        label: '(GMT -11:00) Midway Island, Samoa'
      }, {
        name: 'Etc/UTC',
        label: '(GMT) UTC'
      }, {
        name: 'Pacific/Kwajalein',
        label: '(GMT +12:00) International Date Line West'
      }]);
      this.set('timezone', 'Etc/UTC');
    });
    (0, _mocha.it)('renders', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-timezone-select
                  availableTimezones=availableTimezones
                  timezone=timezone}}
      */
      {
        "id": "GrX+pFS4",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,2],null,[[\"availableTimezones\",\"timezone\"],[[35,1],[35,0]]]]]],\"hasEval\":false,\"upvars\":[\"timezone\",\"availableTimezones\",\"gh-timezone-select\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)(this.element, 'top-level elements').to.exist;
      (0, _chai.expect)((0, _testHelpers.findAll)('option'), 'number of options').to.have.length(3);
      (0, _chai.expect)((0, _testHelpers.find)('select').value, 'selected option value').to.equal('Etc/UTC');
    });
    (0, _mocha.it)('handles an unknown timezone', async function () {
      this.set('timezone', 'Europe/London');
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-timezone-select
                  availableTimezones=availableTimezones
                  timezone=timezone}}
      */
      {
        "id": "GrX+pFS4",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,2],null,[[\"availableTimezones\",\"timezone\"],[[35,1],[35,0]]]]]],\"hasEval\":false,\"upvars\":[\"timezone\",\"availableTimezones\",\"gh-timezone-select\"]}",
        "moduleName": "(unknown template module)"
      })); // we have an additional blank option at the top

      (0, _chai.expect)((0, _testHelpers.findAll)('option'), 'number of options').to.have.length(4); // blank option is selected

      (0, _chai.expect)((0, _testHelpers.find)('select').value, 'selected option value').to.equal(''); // we indicate the manual override

      (0, _chai.expect)((0, _testHelpers.find)('p').textContent).to.match(/Your timezone has been automatically set to Europe\/London/);
    });
    (0, _mocha.it)('triggers update action on change', async function () {
      let update = _sinon.default.spy();

      this.set('update', update);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-timezone-select
                  availableTimezones=availableTimezones
                  timezone=timezone
                  update=(action update)}}
      */
      {
        "id": "Gc3Xd010",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,4],null,[[\"availableTimezones\",\"timezone\",\"update\"],[[35,3],[35,2],[30,[36,1],[[32,0],[35,0]],null]]]]]],\"hasEval\":false,\"upvars\":[\"update\",\"action\",\"timezone\",\"availableTimezones\",\"gh-timezone-select\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _testHelpers.fillIn)('select', 'Pacific/Pago_Pago');
      await (0, _testHelpers.blur)('select');
      (0, _chai.expect)(update.calledOnce, 'update was called once').to.be.true;
      (0, _chai.expect)(update.firstCall.args[0].name, 'update was passed new timezone').to.equal('Pacific/Pago_Pago');
    }); // TODO: mock clock service, fake the time, test we have the correct
    // local time and it changes alongside selection changes

    (0, _mocha.it)('renders local time');
  });
});
define("ghost-admin/tests/integration/components/gh-trim-focus-input-test", ["@ember/test-helpers", "mocha", "chai", "ember-mocha"], function (_testHelpers, _mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Integration: Component: gh-trim-focus-input', function () {
    (0, _emberMocha.setupRenderingTest)();
    (0, _mocha.it)('trims value on focusOut', async function () {
      this.set('text', 'some random stuff    ');
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-trim-focus-input value=(readonly text) input=(action (mut text) value="target.value")}}
      */
      {
        "id": "Ybt9Cam2",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,4],null,[[\"value\",\"input\"],[[30,[36,3],[[35,0]],null],[30,[36,2],[[32,0],[30,[36,1],[[35,0]],null]],[[\"value\"],[\"target.value\"]]]]]]]],\"hasEval\":false,\"upvars\":[\"text\",\"mut\",\"action\",\"readonly\",\"gh-trim-focus-input\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _testHelpers.blur)('input');
      (0, _chai.expect)(this.text).to.equal('some random stuff');
    });
    (0, _mocha.it)('trims value on focusOut before calling custom focus-out', async function () {
      this.set('text', 'some random stuff    ');
      this.set('customFocusOut', function (value) {
        (0, _chai.expect)((0, _testHelpers.find)('.gh-input').value, 'input value').to.equal('some random stuff');
        (0, _chai.expect)(value, 'value').to.equal('some random stuff');
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-trim-focus-input
                  value=(readonly text)
                  input=(action (mut text) value="target.value")
                  focus-out=(action customFocusOut)
              }}
      */
      {
        "id": "QJUam4fj",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,5],null,[[\"value\",\"input\",\"focus-out\"],[[30,[36,4],[[35,2]],null],[30,[36,1],[[32,0],[30,[36,3],[[35,2]],null]],[[\"value\"],[\"target.value\"]]],[30,[36,1],[[32,0],[35,0]],null]]]]]],\"hasEval\":false,\"upvars\":[\"customFocusOut\",\"action\",\"text\",\"mut\",\"readonly\",\"gh-trim-focus-input\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _testHelpers.blur)('input');
      (0, _chai.expect)(this.text).to.equal('some random stuff');
    });
    (0, _mocha.it)('does not have the autofocus attribute if not set to focus', async function () {
      this.set('text', 'some text');
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-trim-focus-input value=(readonly text) shouldFocus=false}}
      */
      {
        "id": "NJxghGPG",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,2],null,[[\"value\",\"shouldFocus\"],[[30,[36,1],[[35,0]],null],false]]]]],\"hasEval\":false,\"upvars\":[\"text\",\"readonly\",\"gh-trim-focus-input\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.find)('input').autofocus).to.not.be.ok;
    });
    (0, _mocha.it)('has the autofocus attribute if set to focus', async function () {
      this.set('text', 'some text');
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-trim-focus-input value=(readonly text) shouldFocus=true}}
      */
      {
        "id": "r+l/YkQo",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,2],null,[[\"value\",\"shouldFocus\"],[[30,[36,1],[[35,0]],null],true]]]]],\"hasEval\":false,\"upvars\":[\"text\",\"readonly\",\"gh-trim-focus-input\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.find)('input').autofocus).to.be.ok;
    });
    (0, _mocha.it)('handles undefined values', async function () {
      this.set('text', undefined);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-trim-focus-input value=(readonly text) shouldFocus=true}}
      */
      {
        "id": "r+l/YkQo",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,2],null,[[\"value\",\"shouldFocus\"],[[30,[36,1],[[35,0]],null],true]]]]],\"hasEval\":false,\"upvars\":[\"text\",\"readonly\",\"gh-trim-focus-input\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.find)('input').autofocus).to.be.ok;
    });
    (0, _mocha.it)('handles non-string values', async function () {
      this.set('text', 10);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-trim-focus-input value=(readonly text) shouldFocus=true}}
      */
      {
        "id": "r+l/YkQo",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,2],null,[[\"value\",\"shouldFocus\"],[[30,[36,1],[[35,0]],null],true]]]]],\"hasEval\":false,\"upvars\":[\"text\",\"readonly\",\"gh-trim-focus-input\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.find)('input').value).to.equal('10');
    });
  });
});
define("ghost-admin/tests/integration/components/gh-unsplash-photo-test", ["mocha", "chai", "@ember/test-helpers", "ember-mocha"], function (_mocha, _chai, _testHelpers, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Integration: Component: gh-unsplash-photo', function () {
    (0, _emberMocha.setupRenderingTest)();
    beforeEach(function () {
      // NOTE: images.unsplash.com replaced with example.com to ensure we aren't
      // loading lots of images during tests and we get an immediate 404
      this.set('photo', {
        id: 'OYFHT4X5isg',
        created_at: '2017-08-09T00:20:42-04:00',
        updated_at: '2017-08-11T08:27:42-04:00',
        width: 5184,
        height: 3456,
        color: '#A8A99B',
        likes: 58,
        liked_by_user: false,
        description: null,
        user: {
          id: 'cEpP9pR9Q7E',
          updated_at: '2017-08-11T08:27:42-04:00',
          username: 'danotis',
          name: 'Dan Otis',
          first_name: 'Dan',
          last_name: 'Otis',
          twitter_username: 'danotis',
          portfolio_url: 'http://dan.exposure.co',
          bio: 'Senior Visual Designer at Huge ',
          location: 'San Jose, CA',
          total_likes: 0,
          total_photos: 8,
          total_collections: 0,
          profile_image: {
            small: 'https://example.com/profile-fb-1502251227-8fe7a0522137.jpg?ixlib=rb-0.3.5&q=80&fm=jpg&crop=faces&cs=tinysrgb&fit=crop&h=32&w=32&s=37f67120fc464d7d920ff23c84963b38',
            medium: 'https://example.com/profile-fb-1502251227-8fe7a0522137.jpg?ixlib=rb-0.3.5&q=80&fm=jpg&crop=faces&cs=tinysrgb&fit=crop&h=64&w=64&s=0a4f8a583caec826ac6b1ca80161fa43',
            large: 'https://example.com/profile-fb-1502251227-8fe7a0522137.jpg?ixlib=rb-0.3.5&q=80&fm=jpg&crop=faces&cs=tinysrgb&fit=crop&h=128&w=128&s=b3aa4206e5d87f3eaa7bbe9180ebcd2b'
          },
          links: {
            self: 'https://api.unsplash.com/users/danotis',
            html: 'https://unsplash.com/@danotis',
            photos: 'https://api.unsplash.com/users/danotis/photos',
            likes: 'https://api.unsplash.com/users/danotis/likes',
            portfolio: 'https://api.unsplash.com/users/danotis/portfolio',
            following: 'https://api.unsplash.com/users/danotis/following',
            followers: 'https://api.unsplash.com/users/danotis/followers'
          }
        },
        current_user_collections: [],
        urls: {
          raw: 'https://example.com/photo-1502252430442-aac78f397426',
          full: 'https://example.com/photo-1502252430442-aac78f397426?ixlib=rb-0.3.5&q=85&fm=jpg&crop=entropy&cs=srgb&s=20f86c2f7bbb019122498a45d8260ee9',
          regular: 'https://example.com/photo-1502252430442-aac78f397426?ixlib=rb-0.3.5&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=1080&fit=max&s=181760db8b7a61fa60a35277d7eb434e',
          small: 'https://example.com/photo-1502252430442-aac78f397426?ixlib=rb-0.3.5&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=400&fit=max&s=1e2265597b59e874a1a002b4c3fd961c',
          thumb: 'https://example.com/photo-1502252430442-aac78f397426?ixlib=rb-0.3.5&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=200&fit=max&s=57c86b0692bea92a282b9ab0dbfdacf4'
        },
        categories: [],
        links: {
          self: 'https://api.unsplash.com/photos/OYFHT4X5isg',
          html: 'https://unsplash.com/photos/OYFHT4X5isg',
          download: 'https://unsplash.com/photos/OYFHT4X5isg/download',
          download_location: 'https://api.unsplash.com/photos/OYFHT4X5isg/download'
        },
        ratio: 0.6666666666666666
      });
    });
    (0, _mocha.it)('sets background-color style', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-unsplash-photo photo=photo}}
      */
      {
        "id": "oThYcLfU",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,1],null,[[\"photo\"],[[35,0]]]]]],\"hasEval\":false,\"upvars\":[\"photo\",\"gh-unsplash-photo\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-unsplash-photo-container]').attributes.style.value).to.have.string('background-color: #A8A99B');
    });
    (0, _mocha.it)('sets padding-bottom style', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-unsplash-photo photo=photo}}
      */
      {
        "id": "oThYcLfU",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,1],null,[[\"photo\"],[[35,0]]]]]],\"hasEval\":false,\"upvars\":[\"photo\",\"gh-unsplash-photo\"]}",
        "moduleName": "(unknown template module)"
      })); // don't check full padding-bottom value as it will likely vary across
      // browsers

      (0, _chai.expect)((0, _testHelpers.find)('[data-test-unsplash-photo-container]').attributes.style.value).to.have.string('padding-bottom: 66.66');
    });
    (0, _mocha.it)('uses correct image size url', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-unsplash-photo photo=photo}}
      */
      {
        "id": "oThYcLfU",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,1],null,[[\"photo\"],[[35,0]]]]]],\"hasEval\":false,\"upvars\":[\"photo\",\"gh-unsplash-photo\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-unsplash-photo-image]').attributes.src.value).to.have.string('&w=1200');
    });
    (0, _mocha.it)('calculates image width/height', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-unsplash-photo photo=photo}}
      */
      {
        "id": "oThYcLfU",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,1],null,[[\"photo\"],[[35,0]]]]]],\"hasEval\":false,\"upvars\":[\"photo\",\"gh-unsplash-photo\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-unsplash-photo-image]').attributes.width.value).to.equal('1200');
      (0, _chai.expect)((0, _testHelpers.find)('[data-test-unsplash-photo-image]').attributes.height.value).to.equal('800');
    });
    (0, _mocha.it)('triggers insert action');
    (0, _mocha.it)('triggers zoom action');
    (0, _mocha.describe)('zoomed', function () {
      (0, _mocha.it)('omits padding-bottom style');
      (0, _mocha.it)('triggers insert action');
      (0, _mocha.it)('triggers zoom action');
    });
  });
});
define("ghost-admin/tests/integration/components/gh-unsplash-test", ["mocha", "chai", "@ember/test-helpers", "ember-mocha"], function (_mocha, _chai, _testHelpers, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Integration: Component: gh-unsplash', function () {
    (0, _emberMocha.setupRenderingTest)();
    (0, _mocha.it)('renders', async function () {
      // Set any properties with this.set('myProperty', 'value');
      // Handle any actions with this.on('myAction', function(val) { ... });
      // Template block usage:
      // await render(hbs`
      //   {{#gh-unsplash}}
      //     template content
      //   {{/gh-unsplash}}
      // `);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-unsplash}}
      */
      {
        "id": "nReFD4FR",
        "block": "{\"symbols\":[],\"statements\":[[1,[34,0]]],\"hasEval\":false,\"upvars\":[\"gh-unsplash\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)(this.element).to.exist;
    });
    (0, _mocha.it)('loads new photos by default');
    (0, _mocha.it)('has responsive columns');
    (0, _mocha.it)('can zoom');
    (0, _mocha.it)('can close zoom by clicking on image');
    (0, _mocha.it)('can close zoom by clicking outside image');
    (0, _mocha.it)('triggers insert action');
    (0, _mocha.it)('handles errors');
    (0, _mocha.describe)('searching', function () {
      (0, _mocha.it)('works');
      (0, _mocha.it)('handles no results');
      (0, _mocha.it)('handles error');
    });
    (0, _mocha.describe)('closing', function () {
      (0, _mocha.it)('triggers close action');
      (0, _mocha.it)('can be triggerd by escape key');
      (0, _mocha.it)('cannot be triggered by escape key when zoomed');
    });
  });
});
define("ghost-admin/tests/integration/components/gh-uploader-test", ["pretender", "ghost-admin/utils/ghost-paths", "sinon", "@ember/test-helpers", "ghost-admin/tests/helpers/file-upload", "mocha", "chai", "ember-mocha"], function (_pretender, _ghostPaths, _sinon, _testHelpers, _fileUpload, _mocha, _chai, _emberMocha) {
  "use strict";

  const stubSuccessfulUpload = function (server) {
    let delay = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
    server.post(`${(0, _ghostPaths.default)().apiRoot}/images/upload/`, function () {
      return [200, {
        'Content-Type': 'application/json'
      }, '{"images": [{"url": "/content/images/test.png"}]}'];
    }, delay);
  };

  const stubFailedUpload = function (server, code, error) {
    let delay = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;
    server.post(`${(0, _ghostPaths.default)().apiRoot}/images/upload/`, function () {
      return [code, {
        'Content-Type': 'application/json'
      }, JSON.stringify({
        errors: [{
          type: error,
          message: `Error: ${error}`
        }]
      })];
    }, delay);
  };

  (0, _mocha.describe)('Integration: Component: gh-uploader', function () {
    (0, _emberMocha.setupRenderingTest)();
    let server;
    beforeEach(function () {
      server = new _pretender.default();
    });
    afterEach(function () {
      server.shutdown();
    });
    (0, _mocha.describe)('uploads', function () {
      beforeEach(function () {
        stubSuccessfulUpload(server);
      });
      (0, _mocha.it)('triggers uploads when `files` is set', async function () {
        await (0, _testHelpers.render)(Ember.HTMLBars.template(
        /*
          {{#gh-uploader files=files}}{{/gh-uploader}}
        */
        {
          "id": "OcnO1Max",
          "block": "{\"symbols\":[],\"statements\":[[6,[37,1],null,[[\"files\"],[[35,0]]],[[\"default\"],[{\"statements\":[],\"parameters\":[]}]]]],\"hasEval\":false,\"upvars\":[\"files\",\"gh-uploader\"]}",
          "moduleName": "(unknown template module)"
        }));
        this.set('files', [(0, _fileUpload.createFile)()]);
        await (0, _testHelpers.settled)();
        let [lastRequest] = server.handledRequests;
        (0, _chai.expect)(server.handledRequests.length).to.equal(1);
        (0, _chai.expect)(lastRequest.url).to.equal(`${(0, _ghostPaths.default)().apiRoot}/images/upload/`); // requestBody is a FormData object
        // this will fail in anything other than Chrome and Firefox
        // https://developer.mozilla.org/en-US/docs/Web/API/FormData#Browser_compatibility

        (0, _chai.expect)(lastRequest.requestBody.has('file')).to.be.true;
      });
      (0, _mocha.it)('triggers multiple uploads', async function () {
        await (0, _testHelpers.render)(Ember.HTMLBars.template(
        /*
          {{#gh-uploader files=files}}{{/gh-uploader}}
        */
        {
          "id": "OcnO1Max",
          "block": "{\"symbols\":[],\"statements\":[[6,[37,1],null,[[\"files\"],[[35,0]]],[[\"default\"],[{\"statements\":[],\"parameters\":[]}]]]],\"hasEval\":false,\"upvars\":[\"files\",\"gh-uploader\"]}",
          "moduleName": "(unknown template module)"
        }));
        this.set('files', [(0, _fileUpload.createFile)(), (0, _fileUpload.createFile)()]);
        await (0, _testHelpers.settled)();
        (0, _chai.expect)(server.handledRequests.length).to.equal(2);
      });
      (0, _mocha.it)('triggers onStart when upload starts', async function () {
        this.set('uploadStarted', _sinon.default.spy());
        await (0, _testHelpers.render)(Ember.HTMLBars.template(
        /*
          {{#gh-uploader files=files onStart=(action uploadStarted)}}{{/gh-uploader}}
        */
        {
          "id": "ZuPbe7sv",
          "block": "{\"symbols\":[],\"statements\":[[6,[37,3],null,[[\"files\",\"onStart\"],[[35,2],[30,[36,1],[[32,0],[35,0]],null]]],[[\"default\"],[{\"statements\":[],\"parameters\":[]}]]]],\"hasEval\":false,\"upvars\":[\"uploadStarted\",\"action\",\"files\",\"gh-uploader\"]}",
          "moduleName": "(unknown template module)"
        }));
        this.set('files', [(0, _fileUpload.createFile)(), (0, _fileUpload.createFile)()]);
        await (0, _testHelpers.settled)();
        (0, _chai.expect)(this.uploadStarted.calledOnce).to.be.true;
      });
      (0, _mocha.it)('triggers onUploadSuccess when a file uploads', async function () {
        this.set('fileUploaded', _sinon.default.spy());
        await (0, _testHelpers.render)(Ember.HTMLBars.template(
        /*
          {{#gh-uploader files=files onUploadSuccess=(action fileUploaded)}}{{/gh-uploader}}
        */
        {
          "id": "UEG+EqTX",
          "block": "{\"symbols\":[],\"statements\":[[6,[37,3],null,[[\"files\",\"onUploadSuccess\"],[[35,2],[30,[36,1],[[32,0],[35,0]],null]]],[[\"default\"],[{\"statements\":[],\"parameters\":[]}]]]],\"hasEval\":false,\"upvars\":[\"fileUploaded\",\"action\",\"files\",\"gh-uploader\"]}",
          "moduleName": "(unknown template module)"
        }));
        this.set('files', [(0, _fileUpload.createFile)(['test'], {
          name: 'file1.png'
        }), (0, _fileUpload.createFile)()]);
        await (0, _testHelpers.settled)(); // triggered for each file

        (0, _chai.expect)(this.fileUploaded.calledTwice).to.be.true; // filename and url is passed in arg

        let firstCall = this.fileUploaded.getCall(0);
        (0, _chai.expect)(firstCall.args[0].fileName).to.equal('file1.png');
        (0, _chai.expect)(firstCall.args[0].url).to.equal('/content/images/test.png');
      });
      (0, _mocha.it)('triggers onComplete when all files uploaded', async function () {
        this.set('uploadsFinished', _sinon.default.spy());
        await (0, _testHelpers.render)(Ember.HTMLBars.template(
        /*
          {{#gh-uploader files=files onComplete=(action uploadsFinished)}}{{/gh-uploader}}
        */
        {
          "id": "uKnhyF0t",
          "block": "{\"symbols\":[],\"statements\":[[6,[37,3],null,[[\"files\",\"onComplete\"],[[35,2],[30,[36,1],[[32,0],[35,0]],null]]],[[\"default\"],[{\"statements\":[],\"parameters\":[]}]]]],\"hasEval\":false,\"upvars\":[\"uploadsFinished\",\"action\",\"files\",\"gh-uploader\"]}",
          "moduleName": "(unknown template module)"
        }));
        this.set('files', [(0, _fileUpload.createFile)(['test'], {
          name: 'file1.png'
        }), (0, _fileUpload.createFile)(['test'], {
          name: 'file2.png'
        })]);
        await (0, _testHelpers.settled)();
        (0, _chai.expect)(this.uploadsFinished.calledOnce).to.be.true; // array of filenames and urls is passed in arg

        let [result] = this.uploadsFinished.getCall(0).args;
        (0, _chai.expect)(result.length).to.equal(2);
        (0, _chai.expect)(result[0].fileName).to.equal('file1.png');
        (0, _chai.expect)(result[0].url).to.equal('/content/images/test.png');
        (0, _chai.expect)(result[1].fileName).to.equal('file2.png');
        (0, _chai.expect)(result[1].url).to.equal('/content/images/test.png');
      });
      (0, _mocha.it)('onComplete only passes results for last upload', async function () {
        this.set('uploadsFinished', _sinon.default.spy());
        await (0, _testHelpers.render)(Ember.HTMLBars.template(
        /*
          {{#gh-uploader files=files onComplete=(action uploadsFinished)}}{{/gh-uploader}}
        */
        {
          "id": "uKnhyF0t",
          "block": "{\"symbols\":[],\"statements\":[[6,[37,3],null,[[\"files\",\"onComplete\"],[[35,2],[30,[36,1],[[32,0],[35,0]],null]]],[[\"default\"],[{\"statements\":[],\"parameters\":[]}]]]],\"hasEval\":false,\"upvars\":[\"uploadsFinished\",\"action\",\"files\",\"gh-uploader\"]}",
          "moduleName": "(unknown template module)"
        }));
        this.set('files', [(0, _fileUpload.createFile)(['test'], {
          name: 'file1.png'
        })]);
        await (0, _testHelpers.settled)();
        this.set('files', [(0, _fileUpload.createFile)(['test'], {
          name: 'file2.png'
        })]);
        await (0, _testHelpers.settled)();
        let [results] = this.uploadsFinished.getCall(1).args;
        (0, _chai.expect)(results.length).to.equal(1);
        (0, _chai.expect)(results[0].fileName).to.equal('file2.png');
      });
      (0, _mocha.it)('onComplete returns results in same order as selected', async function () {
        // first request has a delay to simulate larger file
        server.post(`${(0, _ghostPaths.default)().apiRoot}/images/upload/`, function () {
          // second request has no delay to simulate small file
          stubSuccessfulUpload(server, 0);
          return [200, {
            'Content-Type': 'application/json'
          }, '"/content/images/test.png"'];
        }, 100);
        this.set('uploadsFinished', _sinon.default.spy());
        await (0, _testHelpers.render)(Ember.HTMLBars.template(
        /*
          {{#gh-uploader files=files onComplete=(action uploadsFinished)}}{{/gh-uploader}}
        */
        {
          "id": "uKnhyF0t",
          "block": "{\"symbols\":[],\"statements\":[[6,[37,3],null,[[\"files\",\"onComplete\"],[[35,2],[30,[36,1],[[32,0],[35,0]],null]]],[[\"default\"],[{\"statements\":[],\"parameters\":[]}]]]],\"hasEval\":false,\"upvars\":[\"uploadsFinished\",\"action\",\"files\",\"gh-uploader\"]}",
          "moduleName": "(unknown template module)"
        }));
        this.set('files', [(0, _fileUpload.createFile)(['test'], {
          name: 'file1.png'
        }), // large - finishes last
        (0, _fileUpload.createFile)(['test'], {
          name: 'file2.png'
        }) // small - finishes first
        ]);
        await (0, _testHelpers.settled)();
        let [results] = this.uploadsFinished.getCall(0).args;
        (0, _chai.expect)(results.length).to.equal(2);
        (0, _chai.expect)(results[0].fileName).to.equal('file1.png');
      });
      (0, _mocha.it)('doesn\'t allow new files to be set whilst uploading', async function () {
        let errorSpy = _sinon.default.spy(console, 'error');

        stubSuccessfulUpload(server, 100);
        await (0, _testHelpers.render)(Ember.HTMLBars.template(
        /*
          {{#gh-uploader files=files}}{{/gh-uploader}}
        */
        {
          "id": "OcnO1Max",
          "block": "{\"symbols\":[],\"statements\":[[6,[37,1],null,[[\"files\"],[[35,0]]],[[\"default\"],[{\"statements\":[],\"parameters\":[]}]]]],\"hasEval\":false,\"upvars\":[\"files\",\"gh-uploader\"]}",
          "moduleName": "(unknown template module)"
        }));
        this.set('files', [(0, _fileUpload.createFile)()]); // logs error because upload is in progress

        this.set('files', [(0, _fileUpload.createFile)()]);
        await (0, _testHelpers.settled)(); // runs ok because original upload has finished

        this.set('files', [(0, _fileUpload.createFile)()]);
        await (0, _testHelpers.settled)();
        (0, _chai.expect)(server.handledRequests.length).to.equal(2);
        (0, _chai.expect)(errorSpy.calledOnce).to.be.true;
        errorSpy.restore();
      });
      (0, _mocha.it)('yields isUploading whilst upload is in progress', async function () {
        stubSuccessfulUpload(server, 100);
        await (0, _testHelpers.render)(Ember.HTMLBars.template(
        /*
          
                    {{#gh-uploader files=files as |uploader|}}
                        {{#if uploader.isUploading}}
                            <div class="is-uploading-test"></div>
                        {{/if}}
                    {{/gh-uploader}}
        */
        {
          "id": "HAkB57hF",
          "block": "{\"symbols\":[\"uploader\"],\"statements\":[[2,\"\\n\"],[6,[37,2],null,[[\"files\"],[[35,1]]],[[\"default\"],[{\"statements\":[[6,[37,0],[[32,1,[\"isUploading\"]]],null,[[\"default\"],[{\"statements\":[[2,\"                    \"],[10,\"div\"],[14,0,\"is-uploading-test\"],[12],[13],[2,\"\\n\"]],\"parameters\":[]}]]]],\"parameters\":[1]}]]]],\"hasEval\":false,\"upvars\":[\"if\",\"files\",\"gh-uploader\"]}",
          "moduleName": "(unknown template module)"
        }));
        this.set('files', [(0, _fileUpload.createFile)(), (0, _fileUpload.createFile)()]);
        await (0, _testHelpers.waitFor)('.is-uploading-test', {
          timeout: 150
        });
        await (0, _testHelpers.settled)();
        (0, _chai.expect)((0, _testHelpers.find)('.is-uploading-test')).to.not.exist;
      });
      (0, _mocha.it)('yields progressBar component with total upload progress', async function () {
        stubSuccessfulUpload(server, 100);
        await (0, _testHelpers.render)(Ember.HTMLBars.template(
        /*
          
                    {{#gh-uploader files=files as |uploader|}}
                        {{uploader.progressBar}}
                    {{/gh-uploader}}
        */
        {
          "id": "3b9mGS96",
          "block": "{\"symbols\":[\"uploader\"],\"statements\":[[2,\"\\n\"],[6,[37,1],null,[[\"files\"],[[35,0]]],[[\"default\"],[{\"statements\":[[2,\"                \"],[1,[32,1,[\"progressBar\"]]],[2,\"\\n\"]],\"parameters\":[1]}]]]],\"hasEval\":false,\"upvars\":[\"files\",\"gh-uploader\"]}",
          "moduleName": "(unknown template module)"
        }));
        this.set('files', [(0, _fileUpload.createFile)(), (0, _fileUpload.createFile)()]);
        await (0, _testHelpers.waitFor)('[data-test-progress-bar]', {
          timeout: 150
        });
        let progressBar = (0, _testHelpers.find)('[data-test-progress-bar]');
        await (0, _testHelpers.waitUntil)(() => {
          let width = parseInt(progressBar.style.width);
          return width > 50;
        }, {
          timeout: 150
        });
        await (0, _testHelpers.settled)();
        let finalProgressWidth = parseInt((0, _testHelpers.find)('[data-test-progress-bar]').style.width);
        (0, _chai.expect)(finalProgressWidth, 'final progress width').to.equal(100);
      });
      (0, _mocha.it)('yields files property', async function () {
        await (0, _testHelpers.render)(Ember.HTMLBars.template(
        /*
          
                    {{#gh-uploader files=files as |uploader|}}
                        {{#each uploader.files as |file|}}
                            <div class="file">{{file.name}}</div>
                        {{/each}}
                    {{/gh-uploader}}
        */
        {
          "id": "yVXgj8iL",
          "block": "{\"symbols\":[\"uploader\",\"file\"],\"statements\":[[2,\"\\n\"],[6,[37,3],null,[[\"files\"],[[35,2]]],[[\"default\"],[{\"statements\":[[6,[37,1],[[30,[36,0],[[30,[36,0],[[32,1,[\"files\"]]],null]],null]],null,[[\"default\"],[{\"statements\":[[2,\"                    \"],[10,\"div\"],[14,0,\"file\"],[12],[1,[32,2,[\"name\"]]],[13],[2,\"\\n\"]],\"parameters\":[2]}]]]],\"parameters\":[1]}]]]],\"hasEval\":false,\"upvars\":[\"-track-array\",\"each\",\"files\",\"gh-uploader\"]}",
          "moduleName": "(unknown template module)"
        }));
        this.set('files', [(0, _fileUpload.createFile)(['test'], {
          name: 'file1.png'
        }), (0, _fileUpload.createFile)(['test'], {
          name: 'file2.png'
        })]);
        (0, _chai.expect)((0, _testHelpers.findAll)('.file')[0].textContent).to.equal('file1.png');
        (0, _chai.expect)((0, _testHelpers.findAll)('.file')[1].textContent).to.equal('file2.png');
      });
      (0, _mocha.it)('can be cancelled', async function () {
        stubSuccessfulUpload(server, 200);
        this.set('cancelled', _sinon.default.spy());
        this.set('complete', _sinon.default.spy());
        await (0, _testHelpers.render)(Ember.HTMLBars.template(
        /*
          
                    {{#gh-uploader files=files onCancel=(action cancelled) as |uploader|}}
                        {{#if uploader.isUploading}}
                            <button class="cancel-button" {{action uploader.cancel}}>Cancel</button>
                        {{/if}}
                    {{/gh-uploader}}
        */
        {
          "id": "o+/w0QUS",
          "block": "{\"symbols\":[\"uploader\"],\"statements\":[[2,\"\\n\"],[6,[37,4],null,[[\"files\",\"onCancel\"],[[35,3],[30,[36,0],[[32,0],[35,2]],null]]],[[\"default\"],[{\"statements\":[[6,[37,1],[[32,1,[\"isUploading\"]]],null,[[\"default\"],[{\"statements\":[[2,\"                    \"],[11,\"button\"],[24,0,\"cancel-button\"],[4,[38,0],[[32,0],[32,1,[\"cancel\"]]],null],[12],[2,\"Cancel\"],[13],[2,\"\\n\"]],\"parameters\":[]}]]]],\"parameters\":[1]}]]]],\"hasEval\":false,\"upvars\":[\"action\",\"if\",\"cancelled\",\"files\",\"gh-uploader\"]}",
          "moduleName": "(unknown template module)"
        }));
        this.set('files', [(0, _fileUpload.createFile)()]);
        await (0, _testHelpers.waitFor)('.cancel-button');
        await (0, _testHelpers.click)('.cancel-button');
        (0, _chai.expect)(this.cancelled.calledOnce, 'onCancel triggered').to.be.true;
        (0, _chai.expect)(this.complete.notCalled, 'onComplete triggered').to.be.true;
      });
      (0, _mocha.it)('uploads to supplied `uploadUrl`', async function () {
        server.post(`${(0, _ghostPaths.default)().apiRoot}/images/`, function () {
          return [200, {
            'Content-Type': 'application/json'
          }, '{"images": [{"url": "/content/images/test.png"}]'];
        });
        await (0, _testHelpers.render)(Ember.HTMLBars.template(
        /*
          {{#gh-uploader files=files uploadUrl="/images/"}}{{/gh-uploader}}
        */
        {
          "id": "61OVn41u",
          "block": "{\"symbols\":[],\"statements\":[[6,[37,1],null,[[\"files\",\"uploadUrl\"],[[35,0],\"/images/\"]],[[\"default\"],[{\"statements\":[],\"parameters\":[]}]]]],\"hasEval\":false,\"upvars\":[\"files\",\"gh-uploader\"]}",
          "moduleName": "(unknown template module)"
        }));
        this.set('files', [(0, _fileUpload.createFile)()]);
        await (0, _testHelpers.settled)();
        let [lastRequest] = server.handledRequests;
        (0, _chai.expect)(lastRequest.url).to.equal(`${(0, _ghostPaths.default)().apiRoot}/images/`);
      });
      (0, _mocha.it)('passes supplied paramName in request', async function () {
        await (0, _testHelpers.render)(Ember.HTMLBars.template(
        /*
          {{#gh-uploader files=files paramName="testupload"}}{{/gh-uploader}}
        */
        {
          "id": "vvYvZgMq",
          "block": "{\"symbols\":[],\"statements\":[[6,[37,1],null,[[\"files\",\"paramName\"],[[35,0],\"testupload\"]],[[\"default\"],[{\"statements\":[],\"parameters\":[]}]]]],\"hasEval\":false,\"upvars\":[\"files\",\"gh-uploader\"]}",
          "moduleName": "(unknown template module)"
        }));
        this.set('files', [(0, _fileUpload.createFile)()]);
        await (0, _testHelpers.settled)();
        let [lastRequest] = server.handledRequests; // requestBody is a FormData object
        // this will fail in anything other than Chrome and Firefox
        // https://developer.mozilla.org/en-US/docs/Web/API/FormData#Browser_compatibility

        (0, _chai.expect)(lastRequest.requestBody.has('testupload')).to.be.true;
      });
    });
    (0, _mocha.describe)('validation', function () {
      (0, _mocha.it)('validates file extensions by default', async function () {
        this.set('onFailed', _sinon.default.spy());
        await (0, _testHelpers.render)(Ember.HTMLBars.template(
        /*
          
                        {{#gh-uploader files=files extensions="jpg,jpeg" onFailed=(action onFailed)}}{{/gh-uploader}}
                    
        */
        {
          "id": "CdYcXXgD",
          "block": "{\"symbols\":[],\"statements\":[[2,\"\\n                \"],[6,[37,3],null,[[\"files\",\"extensions\",\"onFailed\"],[[35,2],\"jpg,jpeg\",[30,[36,1],[[32,0],[35,0]],null]]],[[\"default\"],[{\"statements\":[],\"parameters\":[]}]]],[2,\"\\n            \"]],\"hasEval\":false,\"upvars\":[\"onFailed\",\"action\",\"files\",\"gh-uploader\"]}",
          "moduleName": "(unknown template module)"
        }));
        this.set('files', [(0, _fileUpload.createFile)(['test'], {
          name: 'test.png'
        })]);
        await (0, _testHelpers.settled)();
        let [onFailedResult] = this.onFailed.firstCall.args;
        (0, _chai.expect)(onFailedResult.length).to.equal(1);
        (0, _chai.expect)(onFailedResult[0].fileName, 'onFailed file name').to.equal('test.png');
        (0, _chai.expect)(onFailedResult[0].message, 'onFailed message').to.match(/not supported/);
      });
      (0, _mocha.it)('accepts custom validation method', async function () {
        this.set('validate', function (file) {
          return `${file.name} failed test validation`;
        });
        this.set('onFailed', _sinon.default.spy());
        await (0, _testHelpers.render)(Ember.HTMLBars.template(
        /*
          
                        {{#gh-uploader files=files validate=(action validate) onFailed=(action onFailed)}}{{/gh-uploader}}
                    
        */
        {
          "id": "tR/4Jbbw",
          "block": "{\"symbols\":[],\"statements\":[[2,\"\\n                \"],[6,[37,4],null,[[\"files\",\"validate\",\"onFailed\"],[[35,3],[30,[36,1],[[32,0],[35,2]],null],[30,[36,1],[[32,0],[35,0]],null]]],[[\"default\"],[{\"statements\":[],\"parameters\":[]}]]],[2,\"\\n            \"]],\"hasEval\":false,\"upvars\":[\"onFailed\",\"action\",\"validate\",\"files\",\"gh-uploader\"]}",
          "moduleName": "(unknown template module)"
        }));
        this.set('files', [(0, _fileUpload.createFile)(['test'], {
          name: 'test.png'
        })]);
        await (0, _testHelpers.settled)();
        let [onFailedResult] = this.onFailed.firstCall.args;
        (0, _chai.expect)(onFailedResult.length).to.equal(1);
        (0, _chai.expect)(onFailedResult[0].fileName).to.equal('test.png');
        (0, _chai.expect)(onFailedResult[0].message).to.equal('test.png failed test validation');
      });
      (0, _mocha.it)('yields errors when validation fails', async function () {
        await (0, _testHelpers.render)(Ember.HTMLBars.template(
        /*
          
                        {{#gh-uploader files=files extensions="jpg,jpeg" as |uploader|}}
                            {{#each uploader.errors as |error|}}
                                <div class="error-fileName">{{error.fileName}}</div>
                                <div class="error-message">{{error.message}}</div>
                            {{/each}}
                        {{/gh-uploader}}
                    
        */
        {
          "id": "s1ErMiwb",
          "block": "{\"symbols\":[\"uploader\",\"error\"],\"statements\":[[2,\"\\n\"],[6,[37,3],null,[[\"files\",\"extensions\"],[[35,2],\"jpg,jpeg\"]],[[\"default\"],[{\"statements\":[[6,[37,1],[[30,[36,0],[[30,[36,0],[[32,1,[\"errors\"]]],null]],null]],null,[[\"default\"],[{\"statements\":[[2,\"                        \"],[10,\"div\"],[14,0,\"error-fileName\"],[12],[1,[32,2,[\"fileName\"]]],[13],[2,\"\\n                        \"],[10,\"div\"],[14,0,\"error-message\"],[12],[1,[32,2,[\"message\"]]],[13],[2,\"\\n\"]],\"parameters\":[2]}]]]],\"parameters\":[1]}]]],[2,\"            \"]],\"hasEval\":false,\"upvars\":[\"-track-array\",\"each\",\"files\",\"gh-uploader\"]}",
          "moduleName": "(unknown template module)"
        }));
        this.set('files', [(0, _fileUpload.createFile)(['test'], {
          name: 'test.png'
        })]);
        await (0, _testHelpers.settled)();
        (0, _chai.expect)((0, _testHelpers.find)('.error-fileName').textContent).to.equal('test.png');
        (0, _chai.expect)((0, _testHelpers.find)('.error-message').textContent).to.match(/not supported/);
      });
    });
    (0, _mocha.describe)('server errors', function () {
      beforeEach(function () {
        stubFailedUpload(server, 500, 'No upload for you');
      });
      (0, _mocha.it)('triggers onFailed when uploads complete', async function () {
        this.set('uploadFailed', _sinon.default.spy());
        this.set('uploadComplete', _sinon.default.spy());
        await (0, _testHelpers.render)(Ember.HTMLBars.template(
        /*
          
                        {{#gh-uploader
                            files=files
                            onFailed=(action uploadFailed)
                            onComplete=(action uploadComplete)}}
                        {{/gh-uploader}}
                    
        */
        {
          "id": "/WYIYmXu",
          "block": "{\"symbols\":[],\"statements\":[[2,\"\\n\"],[6,[37,4],null,[[\"files\",\"onFailed\",\"onComplete\"],[[35,3],[30,[36,1],[[32,0],[35,2]],null],[30,[36,1],[[32,0],[35,0]],null]]],[[\"default\"],[{\"statements\":[],\"parameters\":[]}]]],[2,\"            \"]],\"hasEval\":false,\"upvars\":[\"uploadComplete\",\"action\",\"uploadFailed\",\"files\",\"gh-uploader\"]}",
          "moduleName": "(unknown template module)"
        }));
        this.set('files', [(0, _fileUpload.createFile)(['test'], {
          name: 'file1.png'
        }), (0, _fileUpload.createFile)(['test'], {
          name: 'file2.png'
        })]);
        await (0, _testHelpers.settled)();
        (0, _chai.expect)(this.uploadFailed.calledOnce).to.be.true;
        (0, _chai.expect)(this.uploadComplete.calledOnce).to.be.true;
        let [failures] = this.uploadFailed.firstCall.args;
        (0, _chai.expect)(failures.length).to.equal(2);
        (0, _chai.expect)(failures[0].fileName).to.equal('file1.png');
        (0, _chai.expect)(failures[0].message).to.equal('Error: No upload for you');
      });
      (0, _mocha.it)('triggers onUploadFailure when each upload fails', async function () {
        this.set('uploadFail', _sinon.default.spy());
        await (0, _testHelpers.render)(Ember.HTMLBars.template(
        /*
          
                        {{#gh-uploader
                            files=files
                            onUploadFailure=(action uploadFail)}}
                        {{/gh-uploader}}
                    
        */
        {
          "id": "29QNJh4M",
          "block": "{\"symbols\":[],\"statements\":[[2,\"\\n\"],[6,[37,3],null,[[\"files\",\"onUploadFailure\"],[[35,2],[30,[36,1],[[32,0],[35,0]],null]]],[[\"default\"],[{\"statements\":[],\"parameters\":[]}]]],[2,\"            \"]],\"hasEval\":false,\"upvars\":[\"uploadFail\",\"action\",\"files\",\"gh-uploader\"]}",
          "moduleName": "(unknown template module)"
        }));
        this.set('files', [(0, _fileUpload.createFile)(['test'], {
          name: 'file1.png'
        }), (0, _fileUpload.createFile)(['test'], {
          name: 'file2.png'
        })]);
        await (0, _testHelpers.settled)();
        (0, _chai.expect)(this.uploadFail.calledTwice).to.be.true;
        let [firstFailure] = this.uploadFail.firstCall.args;
        (0, _chai.expect)(firstFailure.fileName).to.equal('file1.png');
        (0, _chai.expect)(firstFailure.message).to.equal('Error: No upload for you');
        let [secondFailure] = this.uploadFail.secondCall.args;
        (0, _chai.expect)(secondFailure.fileName).to.equal('file2.png');
        (0, _chai.expect)(secondFailure.message).to.equal('Error: No upload for you');
      });
      (0, _mocha.it)('yields errors when uploads fail', async function () {
        await (0, _testHelpers.render)(Ember.HTMLBars.template(
        /*
          
                        {{#gh-uploader files=files as |uploader|}}
                            {{#each uploader.errors as |error|}}
                                <div class="error-fileName">{{error.fileName}}</div>
                                <div class="error-message">{{error.message}}</div>
                            {{/each}}
                        {{/gh-uploader}}
                    
        */
        {
          "id": "mCYamQDe",
          "block": "{\"symbols\":[\"uploader\",\"error\"],\"statements\":[[2,\"\\n\"],[6,[37,3],null,[[\"files\"],[[35,2]]],[[\"default\"],[{\"statements\":[[6,[37,1],[[30,[36,0],[[30,[36,0],[[32,1,[\"errors\"]]],null]],null]],null,[[\"default\"],[{\"statements\":[[2,\"                        \"],[10,\"div\"],[14,0,\"error-fileName\"],[12],[1,[32,2,[\"fileName\"]]],[13],[2,\"\\n                        \"],[10,\"div\"],[14,0,\"error-message\"],[12],[1,[32,2,[\"message\"]]],[13],[2,\"\\n\"]],\"parameters\":[2]}]]]],\"parameters\":[1]}]]],[2,\"            \"]],\"hasEval\":false,\"upvars\":[\"-track-array\",\"each\",\"files\",\"gh-uploader\"]}",
          "moduleName": "(unknown template module)"
        }));
        this.set('files', [(0, _fileUpload.createFile)(['test'], {
          name: 'test.png'
        })]);
        await (0, _testHelpers.settled)();
        (0, _chai.expect)((0, _testHelpers.find)('.error-fileName').textContent).to.equal('test.png');
        (0, _chai.expect)((0, _testHelpers.find)('.error-message').textContent).to.equal('Error: No upload for you');
      });
    });
  });
});
define("ghost-admin/tests/integration/components/gh-validation-status-container-test", ["ember-data", "mocha", "chai", "@ember/test-helpers", "ember-mocha"], function (_emberData, _mocha, _chai, _testHelpers, _emberMocha) {
  "use strict";

  // TODO: remove usage of Ember Data's private `Errors` class when refactoring validations
  // eslint-disable-next-line
  const {
    Errors
  } = _emberData.default;
  (0, _mocha.describe)('Integration: Component: gh-validation-status-container', function () {
    (0, _emberMocha.setupRenderingTest)();
    beforeEach(function () {
      let testObject = Ember.Object.create();
      testObject.set('name', 'Test');
      testObject.set('hasValidated', []);
      testObject.set('errors', Errors.create());
      this.set('testObject', testObject);
    });
    (0, _mocha.it)('has no success/error class by default', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        
                  {{#gh-validation-status-container class="gh-test" property="name" errors=testObject.errors hasValidated=testObject.hasValidated}}
                  {{/gh-validation-status-container}}
              
      */
      {
        "id": "bImPLUto",
        "block": "{\"symbols\":[],\"statements\":[[2,\"\\n\"],[6,[37,1],null,[[\"class\",\"property\",\"errors\",\"hasValidated\"],[\"gh-test\",\"name\",[35,0,[\"errors\"]],[35,0,[\"hasValidated\"]]]],[[\"default\"],[{\"statements\":[],\"parameters\":[]}]]],[2,\"        \"]],\"hasEval\":false,\"upvars\":[\"testObject\",\"gh-validation-status-container\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.find)('.gh-test')).to.exist;
      (0, _chai.expect)((0, _testHelpers.find)('.gh-test')).to.not.have.class('success');
      (0, _chai.expect)((0, _testHelpers.find)('.gh-test')).to.not.have.class('error');
    });
    (0, _mocha.it)('has success class when valid', async function () {
      this.get('testObject.hasValidated').push('name');
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        
                  {{#gh-validation-status-container class="gh-test" property="name" errors=testObject.errors hasValidated=testObject.hasValidated}}
                  {{/gh-validation-status-container}}
              
      */
      {
        "id": "bImPLUto",
        "block": "{\"symbols\":[],\"statements\":[[2,\"\\n\"],[6,[37,1],null,[[\"class\",\"property\",\"errors\",\"hasValidated\"],[\"gh-test\",\"name\",[35,0,[\"errors\"]],[35,0,[\"hasValidated\"]]]],[[\"default\"],[{\"statements\":[],\"parameters\":[]}]]],[2,\"        \"]],\"hasEval\":false,\"upvars\":[\"testObject\",\"gh-validation-status-container\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.find)('.gh-test')).to.exist;
      (0, _chai.expect)((0, _testHelpers.find)('.gh-test')).to.have.class('success');
      (0, _chai.expect)((0, _testHelpers.find)('.gh-test')).to.not.have.class('error');
    });
    (0, _mocha.it)('has error class when invalid', async function () {
      this.get('testObject.hasValidated').push('name');
      this.get('testObject.errors').add('name', 'has error');
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        
                  {{#gh-validation-status-container class="gh-test" property="name" errors=testObject.errors hasValidated=testObject.hasValidated}}
                  {{/gh-validation-status-container}}
              
      */
      {
        "id": "bImPLUto",
        "block": "{\"symbols\":[],\"statements\":[[2,\"\\n\"],[6,[37,1],null,[[\"class\",\"property\",\"errors\",\"hasValidated\"],[\"gh-test\",\"name\",[35,0,[\"errors\"]],[35,0,[\"hasValidated\"]]]],[[\"default\"],[{\"statements\":[],\"parameters\":[]}]]],[2,\"        \"]],\"hasEval\":false,\"upvars\":[\"testObject\",\"gh-validation-status-container\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.find)('.gh-test')).to.exist;
      (0, _chai.expect)((0, _testHelpers.find)('.gh-test')).to.not.have.class('success');
      (0, _chai.expect)((0, _testHelpers.find)('.gh-test')).to.have.class('error');
    });
    (0, _mocha.it)('still renders if hasValidated is undefined', async function () {
      this.set('testObject.hasValidated', undefined);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        
                  {{#gh-validation-status-container class="gh-test" property="name" errors=testObject.errors hasValidated=testObject.hasValidated}}
                  {{/gh-validation-status-container}}
              
      */
      {
        "id": "bImPLUto",
        "block": "{\"symbols\":[],\"statements\":[[2,\"\\n\"],[6,[37,1],null,[[\"class\",\"property\",\"errors\",\"hasValidated\"],[\"gh-test\",\"name\",[35,0,[\"errors\"]],[35,0,[\"hasValidated\"]]]],[[\"default\"],[{\"statements\":[],\"parameters\":[]}]]],[2,\"        \"]],\"hasEval\":false,\"upvars\":[\"testObject\",\"gh-validation-status-container\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.find)('.gh-test')).to.exist;
    });
  });
});
define("ghost-admin/tests/integration/components/gh-whats-new-test", ["mocha", "chai", "@ember/test-helpers", "ember-mocha"], function (_mocha, _chai, _testHelpers, _emberMocha) {
  "use strict";

  _mocha.describe.skip('Integration: Component: gh-whats-new', function () {
    (0, _emberMocha.setupRenderingTest)();
    (0, _mocha.it)('renders', async function () {
      // Set any properties with this.set('myProperty', 'value');
      // Handle any actions with this.set('myAction', function(val) { ... });
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <GhWhatsNew />
      */
      {
        "id": "Auf9gJBN",
        "block": "{\"symbols\":[],\"statements\":[[8,\"gh-whats-new\",[],[[],[]],null]],\"hasEval\":false,\"upvars\":[]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)(this.element.textContent.trim()).to.equal(''); // Template block usage:

      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        
            <GhWhatsNew>
              template block text
            </GhWhatsNew>
          
      */
      {
        "id": "krzFhOIF",
        "block": "{\"symbols\":[],\"statements\":[[2,\"\\n      \"],[8,\"gh-whats-new\",[],[[],[]],[[\"default\"],[{\"statements\":[[2,\"\\n        template block text\\n      \"]],\"parameters\":[]}]]],[2,\"\\n    \"]],\"hasEval\":false,\"upvars\":[]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)(this.element.textContent.trim()).to.equal('template block text');
    });
  });
});
define("ghost-admin/tests/integration/components/koenig-toolbar-test", ["koenig-editor/components/koenig-editor", "@ember/test-helpers", "mocha", "chai", "ember-mocha"], function (_koenigEditor, _testHelpers, _mocha, _chai, _emberMocha) {
  "use strict";

  // TODO: extract to helpers
  function findEditor(element) {
    do {
      if (element[_koenigEditor.TESTING_EXPANDO_PROPERTY]) {
        return element[_koenigEditor.TESTING_EXPANDO_PROPERTY];
      }

      element = element.parentNode;
    } while (element);

    throw new Error('Unable to find ember-mobiledoc-editor from element');
  }

  function insertText(element, text) {
    let editor = findEditor(element);
    return new Promise(resolve => {
      let {
        post
      } = editor;
      editor.run(postEditor => {
        if (editor.post.isBlank) {
          let section = postEditor.builder.createMarkupSection('p');
          postEditor.insertSectionBefore(post.sections, section);
        }

        postEditor.insertText(post.tailPosition(), text);
      });
      requestAnimationFrame(resolve);
    });
  }

  function selectRange(element, range) {
    let editor = findEditor(element);
    return new Promise(resolve => {
      editor.selectRange(range);
      requestAnimationFrame(resolve);
    });
  }

  (0, _mocha.describe)('Integration: Component: koenig-editor/gh-toolbar', function () {
    (0, _emberMocha.setupRenderingTest)();
    (0, _mocha.it)('has a working "Header two" button', async function () {
      let mobiledoc;
      this.set('updateMobiledoc', newMobiledoc => mobiledoc = newMobiledoc);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        <KoenigEditor @onChange={{this.updateMobiledoc}} />
      */
      {
        "id": "+MTvnbJA",
        "block": "{\"symbols\":[],\"statements\":[[8,\"koenig-editor\",[],[[\"@onChange\"],[[32,0,[\"updateMobiledoc\"]]]],null]],\"hasEval\":false,\"upvars\":[]}",
        "moduleName": "(unknown template module)"
      }));
      const editor = findEditor((0, _testHelpers.find)('[data-kg="editor-wrapper"]'));
      await insertText(editor.element, 'Testing');
      (0, _chai.expect)(mobiledoc.sections[0][1]).to.equal('p');
      await selectRange(editor.element, editor.range);
      await (0, _testHelpers.click)('[data-test-button="toolbar-h3"]');
      (0, _chai.expect)(mobiledoc.sections[0][1]).to.equal('h3');
    });
  });
});
define("ghost-admin/tests/integration/components/modal-import-members-test", ["pretender", "ghost-admin/utils/ghost-paths", "sinon", "@ember/test-helpers", "mocha", "chai", "ghost-admin/tests/helpers/file-upload", "ember-mocha"], function (_pretender, _ghostPaths, _sinon, _testHelpers, _mocha, _chai, _fileUpload, _emberMocha) {
  "use strict";

  const notificationsStub = Ember.Service.extend({
    showAPIError() {// noop - to be stubbed
    }

  });

  const stubSuccessfulUpload = function (server) {
    let delay = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
    server.post(`${(0, _ghostPaths.default)().apiRoot}/members/upload/`, function () {
      return [200, {
        'Content-Type': 'application/json'
      }, '{"url":"/content/images/test.png"}'];
    }, delay);
  };

  const stubFailedUpload = function (server, code, error) {
    let delay = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;
    server.post(`${(0, _ghostPaths.default)().apiRoot}/members/upload/`, function () {
      return [code, {
        'Content-Type': 'application/json'
      }, JSON.stringify({
        errors: [{
          type: error,
          message: `Error: ${error}`
        }]
      })];
    }, delay);
  };

  (0, _mocha.describe)('Integration: Component: modal-import-members-test', function () {
    (0, _emberMocha.setupRenderingTest)();
    let server;
    beforeEach(function () {
      server = new _pretender.default();
      this.set('uploadUrl', `${(0, _ghostPaths.default)().apiRoot}/members/upload/`);
      this.owner.register('service:notifications', notificationsStub);
    });
    afterEach(function () {
      server.shutdown();
    });
    (0, _mocha.it)('renders', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{modal-import-members}}
      */
      {
        "id": "cj1W1p3N",
        "block": "{\"symbols\":[],\"statements\":[[1,[34,0]]],\"hasEval\":false,\"upvars\":[\"modal-import-members\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)((0, _testHelpers.find)('h1').textContent.trim(), 'default header').to.equal('Import members');
      (0, _chai.expect)((0, _testHelpers.find)('.description').textContent.trim(), 'upload label').to.equal('Select or drop a CSV file');
    });
    (0, _mocha.it)('generates request to supplied endpoint', async function () {
      stubSuccessfulUpload(server);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{modal-import-members}}
      */
      {
        "id": "cj1W1p3N",
        "block": "{\"symbols\":[],\"statements\":[[1,[34,0]]],\"hasEval\":false,\"upvars\":[\"modal-import-members\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['name,email\r\nmembername,memberemail@example.com'], {
        name: 'test.csv'
      });
      await (0, _testHelpers.waitFor)('table', {
        timeout: 50
      });
      (0, _chai.expect)((0, _testHelpers.find)('label').textContent.trim(), 'labels label').to.equal('Label these members');
      (0, _chai.expect)((0, _testHelpers.find)('.gh-btn-green').textContent).to.match(/Import/g);
      await (0, _testHelpers.click)('.gh-btn-green');
      (0, _chai.expect)(server.handledRequests.length).to.equal(1);
      (0, _chai.expect)(server.handledRequests[0].url).to.equal(`${(0, _ghostPaths.default)().apiRoot}/members/upload/`);
    });
    (0, _mocha.it)('displays server error', async function () {
      stubFailedUpload(server, 415, 'UnsupportedMediaTypeError');
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{modal-import-members}}
      */
      {
        "id": "cj1W1p3N",
        "block": "{\"symbols\":[],\"statements\":[[1,[34,0]]],\"hasEval\":false,\"upvars\":[\"modal-import-members\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['name,email\r\nmembername,memberemail@example.com'], {
        name: 'test.csv'
      }); // Wait for async CSV parsing to finish

      await (0, _testHelpers.waitFor)('table', {
        timeout: 50
      });
      await (0, _testHelpers.click)('.gh-btn-green');
      (0, _chai.expect)((0, _testHelpers.findAll)('.failed').length, 'error message is displayed').to.equal(1);
      (0, _chai.expect)((0, _testHelpers.find)('.failed').textContent).to.match(/The file type you uploaded is not supported/);
    });
    (0, _mocha.it)('displays file too large for server error', async function () {
      stubFailedUpload(server, 413, 'RequestEntityTooLargeError');
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{modal-import-members}}
      */
      {
        "id": "cj1W1p3N",
        "block": "{\"symbols\":[],\"statements\":[[1,[34,0]]],\"hasEval\":false,\"upvars\":[\"modal-import-members\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['name,email\r\nmembername,memberemail@example.com'], {
        name: 'test.csv'
      }); // Wait for async CSV parsing to finish

      await (0, _testHelpers.waitFor)('table', {
        timeout: 50
      });
      await (0, _testHelpers.click)('.gh-btn-green');
      (0, _chai.expect)((0, _testHelpers.findAll)('.failed').length, 'error message is displayed').to.equal(1);
      (0, _chai.expect)((0, _testHelpers.find)('.failed').textContent).to.match(/The file you uploaded was larger/);
    });
    (0, _mocha.it)('handles file too large error directly from the web server', async function () {
      server.post(`${(0, _ghostPaths.default)().apiRoot}/members/upload/`, function () {
        return [413, {}, ''];
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{modal-import-members}}
      */
      {
        "id": "cj1W1p3N",
        "block": "{\"symbols\":[],\"statements\":[[1,[34,0]]],\"hasEval\":false,\"upvars\":[\"modal-import-members\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['name,email\r\nmembername,memberemail@example.com'], {
        name: 'test.csv'
      }); // Wait for async CSV parsing to finish

      await (0, _testHelpers.waitFor)('table', {
        timeout: 50
      });
      await (0, _testHelpers.click)('.gh-btn-green');
      (0, _chai.expect)((0, _testHelpers.findAll)('.failed').length, 'error message is displayed').to.equal(1);
      (0, _chai.expect)((0, _testHelpers.find)('.failed').textContent).to.match(/The file you uploaded was larger/);
    });
    (0, _mocha.it)('displays other server-side error with message', async function () {
      stubFailedUpload(server, 400, 'UnknownError');
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{modal-import-members}}
      */
      {
        "id": "cj1W1p3N",
        "block": "{\"symbols\":[],\"statements\":[[1,[34,0]]],\"hasEval\":false,\"upvars\":[\"modal-import-members\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['name,email\r\nmembername,memberemail@example.com'], {
        name: 'test.csv'
      }); // Wait for async CSV parsing to finish

      await (0, _testHelpers.waitFor)('table', {
        timeout: 50
      });
      await (0, _testHelpers.click)('.gh-btn-green');
      (0, _chai.expect)((0, _testHelpers.findAll)('.failed').length, 'error message is displayed').to.equal(1);
      (0, _chai.expect)((0, _testHelpers.find)('.failed').textContent).to.match(/Error: UnknownError/);
    });
    (0, _mocha.it)('handles unknown failure', async function () {
      server.post(`${(0, _ghostPaths.default)().apiRoot}/members/upload/`, function () {
        return [500, {
          'Content-Type': 'application/json'
        }, ''];
      });
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{modal-import-members}}
      */
      {
        "id": "cj1W1p3N",
        "block": "{\"symbols\":[],\"statements\":[[1,[34,0]]],\"hasEval\":false,\"upvars\":[\"modal-import-members\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['name,email\r\nmembername,memberemail@example.com'], {
        name: 'test.csv'
      }); // Wait for async CSV parsing to finish

      await (0, _testHelpers.waitFor)('table', {
        timeout: 50
      });
      await (0, _testHelpers.click)('.gh-btn-green');
      (0, _chai.expect)((0, _testHelpers.findAll)('.failed').length, 'error message is displayed').to.equal(1);
      (0, _chai.expect)((0, _testHelpers.find)('.failed').textContent).to.match(/Something went wrong/);
    });
    (0, _mocha.it)('triggers notifications.showAPIError for VersionMismatchError', async function () {
      let showAPIError = _sinon.default.spy();

      let notifications = this.owner.lookup('service:notifications');
      notifications.set('showAPIError', showAPIError);
      stubFailedUpload(server, 400, 'VersionMismatchError');
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{modal-import-members}}
      */
      {
        "id": "cj1W1p3N",
        "block": "{\"symbols\":[],\"statements\":[[1,[34,0]]],\"hasEval\":false,\"upvars\":[\"modal-import-members\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['name,email\r\nmembername,memberemail@example.com'], {
        name: 'test.csv'
      }); // Wait for async CSV parsing to finish

      await (0, _testHelpers.waitFor)('table', {
        timeout: 50
      });
      await (0, _testHelpers.click)('.gh-btn-green');
      (0, _chai.expect)(showAPIError.calledOnce).to.be.true;
    });
    (0, _mocha.it)('doesn\'t trigger notifications.showAPIError for other errors', async function () {
      let showAPIError = _sinon.default.spy();

      let notifications = this.owner.lookup('service:notifications');
      notifications.set('showAPIError', showAPIError);
      stubFailedUpload(server, 400, 'UnknownError');
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{modal-import-members}}
      */
      {
        "id": "cj1W1p3N",
        "block": "{\"symbols\":[],\"statements\":[[1,[34,0]]],\"hasEval\":false,\"upvars\":[\"modal-import-members\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['name,email\r\nmembername,memberemail@example.com'], {
        name: 'test.csv'
      }); // Wait for async CSV parsing to finish

      await (0, _testHelpers.waitFor)('table', {
        timeout: 50
      });
      await (0, _testHelpers.click)('.gh-btn-green');
      (0, _chai.expect)(showAPIError.called).to.be.false;
    });
    (0, _mocha.it)('validates extension by default', async function () {
      stubFailedUpload(server, 415);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{modal-import-members}}
      */
      {
        "id": "cj1W1p3N",
        "block": "{\"symbols\":[],\"statements\":[[1,[34,0]]],\"hasEval\":false,\"upvars\":[\"modal-import-members\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _fileUpload.fileUpload)('input[type="file"]', ['name,email\r\nmembername,memberemail@example.com'], {
        name: 'test.csv'
      }); // Wait for async CSV parsing to finish

      await (0, _testHelpers.waitFor)('table', {
        timeout: 50
      });
      await (0, _testHelpers.click)('.gh-btn-green');
      (0, _chai.expect)((0, _testHelpers.findAll)('.failed').length, 'error message is displayed').to.equal(1);
      (0, _chai.expect)((0, _testHelpers.find)('.failed').textContent).to.match(/The file type you uploaded is not supported/);
    });
  });
});
define("ghost-admin/tests/integration/components/modal-transfer-owner-test", ["sinon", "@ember/test-helpers", "mocha", "chai", "ember-mocha"], function (_sinon, _testHelpers, _mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Integration: Component: modal-transfer-owner', function () {
    (0, _emberMocha.setupRenderingTest)();
    (0, _mocha.it)('triggers confirm action', async function () {
      let confirm = _sinon.default.stub();

      let closeModal = _sinon.default.spy();

      confirm.returns(Ember.RSVP.resolve({}));
      this.set('confirm', confirm);
      this.set('closeModal', closeModal);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{modal-transfer-owner confirm=(action confirm) closeModal=(action closeModal)}}
      */
      {
        "id": "dp8atLcE",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,3],null,[[\"confirm\",\"closeModal\"],[[30,[36,1],[[32,0],[35,2]],null],[30,[36,1],[[32,0],[35,0]],null]]]]]],\"hasEval\":false,\"upvars\":[\"closeModal\",\"action\",\"confirm\",\"modal-transfer-owner\"]}",
        "moduleName": "(unknown template module)"
      }));
      await (0, _testHelpers.click)('.gh-btn.gh-btn-red');
      (0, _chai.expect)(confirm.calledOnce, 'confirm called').to.be.true;
      (0, _chai.expect)(closeModal.calledOnce, 'closeModal called').to.be.true;
    });
  });
});
define("ghost-admin/tests/integration/helpers/background-image-style-test", ["mocha", "chai", "@ember/test-helpers", "ember-mocha"], function (_mocha, _chai, _testHelpers, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Integration: Helper: background-image-style', function () {
    (0, _emberMocha.setupRenderingTest)();
    (0, _mocha.it)('renders', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{background-image-style "test.png"}}
      */
      {
        "id": "m3DuKdrl",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,0],[\"test.png\"],null]]],\"hasEval\":false,\"upvars\":[\"background-image-style\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)(this.element).to.have.trimmed.text('background-image: url(test.png);');
    });
    (0, _mocha.it)('escapes URLs', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{background-image-style "test image.png"}}
      */
      {
        "id": "hNGnirr+",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,0],[\"test image.png\"],null]]],\"hasEval\":false,\"upvars\":[\"background-image-style\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)(this.element).to.have.trimmed.text('background-image: url(test%20image.png);');
    });
    (0, _mocha.it)('handles already escaped URLs', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{background-image-style "test%20image.png"}}
      */
      {
        "id": "UPNZ8C3E",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,0],[\"test%20image.png\"],null]]],\"hasEval\":false,\"upvars\":[\"background-image-style\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)(this.element).to.have.trimmed.text('background-image: url(test%20image.png);');
    });
    (0, _mocha.it)('handles empty URLs', async function () {
      this.set('testImage', undefined);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{background-image-style testImage}}
      */
      {
        "id": "LkEPtOAz",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,1],[[35,0]],null]]],\"hasEval\":false,\"upvars\":[\"testImage\",\"background-image-style\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)(this.element, 'undefined').to.have.trimmed.text('');
      this.set('testImage', null);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{background-image-style testImage}}
      */
      {
        "id": "LkEPtOAz",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,1],[[35,0]],null]]],\"hasEval\":false,\"upvars\":[\"testImage\",\"background-image-style\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)(this.element, 'null').to.have.trimmed.text('');
      this.set('testImage', '');
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{background-image-style testImage}}
      */
      {
        "id": "LkEPtOAz",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,1],[[35,0]],null]]],\"hasEval\":false,\"upvars\":[\"testImage\",\"background-image-style\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)(this.element, 'blank').to.have.trimmed.text('');
    });
  });
});
define("ghost-admin/tests/integration/helpers/clean-basic-html-test", ["mocha", "chai", "@ember/test-helpers", "ember-mocha"], function (_mocha, _chai, _testHelpers, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Integration: Helper: clean-basic-html', function () {
    (0, _emberMocha.setupRenderingTest)();
    (0, _mocha.it)('renders', async function () {
      this.set('inputValue', '1234');
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{clean-basic-html inputValue}}
      */
      {
        "id": "aGjcZSVL",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,1],[[35,0]],null]]],\"hasEval\":false,\"upvars\":[\"inputValue\",\"clean-basic-html\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)(this.element).to.have.trimmed.text('1234');
    });
  });
});
define("ghost-admin/tests/integration/helpers/gh-format-post-time-test", ["moment", "sinon", "mocha", "chai", "@ember/test-helpers", "ember-mocha"], function (_moment, _sinon, _mocha, _chai, _testHelpers, _emberMocha) {
  "use strict";

  // because why not?
  const timezoneForTest = 'Iceland';
  (0, _mocha.describe)('Integration: Helper: gh-format-post-time', function () {
    (0, _emberMocha.setupRenderingTest)();

    let sandbox = _sinon.default.createSandbox();

    beforeEach(function () {
      let settings = this.owner.lookup('service:settings');
      settings.content = {};
      settings.set('timezone', timezoneForTest);
    });
    afterEach(function () {
      sandbox.restore();
    });

    function setupMockDate(_ref2) {
      let {
        date,
        utcDate
      } = _ref2;
      let mockDate = (0, _moment.default)(date); // compute expectedTime before we override

      let expectedTime = _moment.default.tz(mockDate, timezoneForTest).format('HH:mm'); // stub moment.utc to return our provided utcDate


      let utcStub = sandbox.stub(_moment.default, 'utc');
      utcStub.returns((0, _moment.default)(utcDate));
      utcStub.onFirstCall().returns(mockDate);
      return {
        expectedTime,
        mockDate
      };
    }

    (0, _mocha.it)('returns basic time difference if post is draft', async function () {
      let mockDate = _moment.default.utc().subtract(1, 'hour');

      this.set('mockDate', mockDate);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-format-post-time mockDate draft=true}}
      */
      {
        "id": "BcZj6SRY",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,1],[[35,0]],[[\"draft\"],[true]]]]],\"hasEval\":false,\"upvars\":[\"mockDate\",\"gh-format-post-time\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)(this.element).to.have.trimmed.text('an hour ago');
    });
    (0, _mocha.it)('returns difference if post was published less than 2 minutes ago', async function () {
      let mockDate = _moment.default.utc().subtract(13, 'minutes');

      this.set('mockDate', mockDate);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-format-post-time mockDate published=true}}
      */
      {
        "id": "dze5Jb/1",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,1],[[35,0]],[[\"published\"],[true]]]]],\"hasEval\":false,\"upvars\":[\"mockDate\",\"gh-format-post-time\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)(this.element).to.have.trimmed.text('13 minutes ago');
    });
    (0, _mocha.it)('returns difference if post is scheduled for less than 2 minutes from now', async function () {
      let mockDate = _moment.default.utc().add(13, 'minutes');

      this.set('mockDate', mockDate);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-format-post-time mockDate scheduled=true}}
      */
      {
        "id": "1hjNdbM1",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,1],[[35,0]],[[\"scheduled\"],[true]]]]],\"hasEval\":false,\"upvars\":[\"mockDate\",\"gh-format-post-time\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)(this.element).to.have.trimmed.text('in 13 minutes');
    });
    (0, _mocha.it)('returns correct format if post was published on the same day', async function () {
      // needs to be outside of 12 hours
      let {
        mockDate,
        expectedTime
      } = setupMockDate({
        date: '2017-09-06T06:00:00Z',
        utcDate: '2017-09-06T19:00:00Z'
      });
      this.set('mockDate', mockDate);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-format-post-time mockDate published=true}}
      */
      {
        "id": "dze5Jb/1",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,1],[[35,0]],[[\"published\"],[true]]]]],\"hasEval\":false,\"upvars\":[\"mockDate\",\"gh-format-post-time\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)(this.element).to.have.trimmed.text(`${expectedTime} (UTC) Today`);
    });
    (0, _mocha.it)('returns correct format if post is scheduled for the same day', async function () {
      // needs to be outside of 12 hours
      let {
        mockDate,
        expectedTime
      } = setupMockDate({
        date: '2017-09-06T06:00:00Z',
        utcDate: '2017-09-06T19:00:00Z'
      });
      this.set('mockDate', mockDate);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-format-post-time mockDate scheduled=true}}
      */
      {
        "id": "1hjNdbM1",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,1],[[35,0]],[[\"scheduled\"],[true]]]]],\"hasEval\":false,\"upvars\":[\"mockDate\",\"gh-format-post-time\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)(this.element).to.have.trimmed.text(`at ${expectedTime} (UTC) Today`);
    });
    (0, _mocha.it)('returns correct format if post was published yesterday', async function () {
      let {
        mockDate,
        expectedTime
      } = setupMockDate({
        date: '2017-09-05T16:00:00Z',
        utcDate: '2017-09-06T18:00:00Z'
      });
      this.set('mockDate', mockDate);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-format-post-time mockDate published=true}}
      */
      {
        "id": "dze5Jb/1",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,1],[[35,0]],[[\"published\"],[true]]]]],\"hasEval\":false,\"upvars\":[\"mockDate\",\"gh-format-post-time\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)(this.element).to.have.trimmed.text(`${expectedTime} (UTC) Yesterday`);
    });
    (0, _mocha.it)('returns correct format if post is scheduled for tomorrow', async function () {
      let {
        mockDate,
        expectedTime
      } = setupMockDate({
        date: '2017-09-07T18:00:00Z',
        utcDate: '2017-09-06T16:00:00Z'
      });
      this.set('mockDate', mockDate);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-format-post-time mockDate scheduled=true}}
      */
      {
        "id": "1hjNdbM1",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,1],[[35,0]],[[\"scheduled\"],[true]]]]],\"hasEval\":false,\"upvars\":[\"mockDate\",\"gh-format-post-time\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)(this.element).to.have.trimmed.text(`at ${expectedTime} (UTC) tomorrow`);
    });
    (0, _mocha.it)('returns correct format if post was published prior to yesterday', async function () {
      let {
        mockDate
      } = setupMockDate({
        date: '2017-09-02T16:00:00Z',
        utcDate: '2017-09-06T18:00:00Z'
      });
      this.set('mockDate', mockDate);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-format-post-time mockDate published=true}}
      */
      {
        "id": "dze5Jb/1",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,1],[[35,0]],[[\"published\"],[true]]]]],\"hasEval\":false,\"upvars\":[\"mockDate\",\"gh-format-post-time\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)(this.element).to.have.trimmed.text('02 Sep 2017');
    });
    (0, _mocha.it)('returns correct format if post is scheduled for later than tomorrow', async function () {
      let {
        mockDate,
        expectedTime
      } = setupMockDate({
        date: '2017-09-10T18:00:00Z',
        utcDate: '2017-09-06T16:00:00Z'
      });
      this.set('mockDate', mockDate);
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{gh-format-post-time mockDate scheduled=true}}
      */
      {
        "id": "1hjNdbM1",
        "block": "{\"symbols\":[],\"statements\":[[1,[30,[36,1],[[35,0]],[[\"scheduled\"],[true]]]]],\"hasEval\":false,\"upvars\":[\"mockDate\",\"gh-format-post-time\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)(this.element).to.have.trimmed.text(`at ${expectedTime} (UTC) on 10 Sep 2017`);
    });
  });
});
define("ghost-admin/tests/integration/helpers/gh-url-preview-test", ["mocha", "chai", "@ember/test-helpers", "ember-mocha"], function (_mocha, _chai, _testHelpers, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit: Component: gh-url-preview', function () {
    (0, _emberMocha.setupRenderingTest)();
    beforeEach(function () {
      let configStub = Ember.Service.extend({
        blogUrl: 'http://my-ghost-blog.com'
      });
      this.owner.register('service:config', configStub);
    });
    (0, _mocha.it)('generates the correct preview URL with a prefix', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        
                  {{gh-url-preview
                      prefix="tag"
                      slug="test-slug"
                      tagName="p"
                      classNames="test-class"}}
      */
      {
        "id": "LHKWcBsL",
        "block": "{\"symbols\":[],\"statements\":[[2,\"\\n            \"],[1,[30,[36,0],null,[[\"prefix\",\"slug\",\"tagName\",\"classNames\"],[\"tag\",\"test-slug\",\"p\",\"test-class\"]]]]],\"hasEval\":false,\"upvars\":[\"gh-url-preview\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)(this.element).to.have.trimmed.text('my-ghost-blog.com/tag/test-slug/');
    });
    (0, _mocha.it)('generates the correct preview URL without a prefix', async function () {
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        
                  {{gh-url-preview
                      slug="test-slug"
                      tagName="p"
                      classNames="test-class"}}
      */
      {
        "id": "MdLhD7UU",
        "block": "{\"symbols\":[],\"statements\":[[2,\"\\n            \"],[1,[30,[36,0],null,[[\"slug\",\"tagName\",\"classNames\"],[\"test-slug\",\"p\",\"test-class\"]]]]],\"hasEval\":false,\"upvars\":[\"gh-url-preview\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)(this.element).to.have.trimmed.text('my-ghost-blog.com/test-slug/');
    });
  });
});
define("ghost-admin/tests/integration/helpers/sanitize-html-test", ["mocha", "chai", "@ember/test-helpers", "ember-mocha"], function (_mocha, _chai, _testHelpers, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Integration: Helper: sanitize-html', function () {
    (0, _emberMocha.setupRenderingTest)();
    (0, _mocha.it)('renders html', async function () {
      this.set('inputValue', '<strong>bold</strong>');
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{{sanitize-html inputValue}}}
      */
      {
        "id": "C1MSMYjQ",
        "block": "{\"symbols\":[],\"statements\":[[2,[30,[36,1],[[35,0]],null]]],\"hasEval\":false,\"upvars\":[\"inputValue\",\"sanitize-html\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)(this.element).to.have.trimmed.html('<strong>bold</strong>');
    });
    (0, _mocha.it)('replaces scripts', async function () {
      this.set('inputValue', '<script></script>');
      await (0, _testHelpers.render)(Ember.HTMLBars.template(
      /*
        {{{sanitize-html inputValue}}}
      */
      {
        "id": "C1MSMYjQ",
        "block": "{\"symbols\":[],\"statements\":[[2,[30,[36,1],[[35,0]],null]]],\"hasEval\":false,\"upvars\":[\"inputValue\",\"sanitize-html\"]}",
        "moduleName": "(unknown template module)"
      }));
      (0, _chai.expect)(this.element).to.have.trimmed.html('<pre class="js-embed-placeholder">Embedded JavaScript</pre>');
    });
  });
});
define("ghost-admin/tests/integration/services/ajax-test", ["pretender", "ghost-admin/config/environment", "mocha", "chai", "ember-ajax/errors", "ghost-admin/services/ajax", "ember-mocha"], function (_pretender, _environment, _mocha, _chai, _errors, _ajax, _emberMocha) {
  "use strict";

  function stubAjaxEndpoint(server) {
    let response = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    let code = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 200;
    server.get('/test/', function () {
      return [code, {
        'Content-Type': 'application/json'
      }, JSON.stringify(response)];
    });
  }

  (0, _mocha.describe)('Integration: Service: ajax', function () {
    (0, _emberMocha.setupTest)();
    let server;
    beforeEach(function () {
      server = new _pretender.default();
    });
    afterEach(function () {
      server.shutdown();
    });
    (0, _mocha.it)('adds Ghost version header to requests', function (done) {
      let {
        version
      } = _environment.default.APP;
      let ajax = this.owner.lookup('service:ajax');
      stubAjaxEndpoint(server, {});
      ajax.request('/test/').then(() => {
        let [request] = server.handledRequests;
        (0, _chai.expect)(request.requestHeaders['X-Ghost-Version']).to.equal(version);
        done();
      });
    });
    (0, _mocha.it)('correctly parses single message response text', function (done) {
      let errorResponse = {
        message: 'Test Error'
      };
      stubAjaxEndpoint(server, errorResponse, 500);
      let ajax = this.owner.lookup('service:ajax');
      ajax.request('/test/').then(() => {
        (0, _chai.expect)(false).to.be.true();
      }).catch(error => {
        (0, _chai.expect)(error.payload.errors.length).to.equal(1);
        (0, _chai.expect)(error.payload.errors[0].message).to.equal('Test Error');
        done();
      });
    });
    (0, _mocha.it)('correctly parses single error response text', function (done) {
      let errorResponse = {
        error: 'Test Error'
      };
      stubAjaxEndpoint(server, errorResponse, 500);
      let ajax = this.owner.lookup('service:ajax');
      ajax.request('/test/').then(() => {
        (0, _chai.expect)(false).to.be.true();
      }).catch(error => {
        (0, _chai.expect)(error.payload.errors.length).to.equal(1);
        (0, _chai.expect)(error.payload.errors[0].message).to.equal('Test Error');
        done();
      });
    });
    (0, _mocha.it)('correctly parses multiple error messages', function (done) {
      let errorResponse = {
        errors: ['First Error', 'Second Error']
      };
      stubAjaxEndpoint(server, errorResponse, 500);
      let ajax = this.owner.lookup('service:ajax');
      ajax.request('/test/').then(() => {
        (0, _chai.expect)(false).to.be.true();
      }).catch(error => {
        (0, _chai.expect)(error.payload.errors.length).to.equal(2);
        (0, _chai.expect)(error.payload.errors[0].message).to.equal('First Error');
        (0, _chai.expect)(error.payload.errors[1].message).to.equal('Second Error');
        done();
      });
    });
    (0, _mocha.it)('returns default error object for non built-in error', function (done) {
      stubAjaxEndpoint(server, {}, 500);
      let ajax = this.owner.lookup('service:ajax');
      ajax.request('/test/').then(() => {
        (0, _chai.expect)(false).to.be.true;
      }).catch(error => {
        (0, _chai.expect)((0, _errors.isAjaxError)(error)).to.be.true;
        done();
      });
    });
    (0, _mocha.it)('handles error checking for built-in errors', function (done) {
      stubAjaxEndpoint(server, '', 401);
      let ajax = this.owner.lookup('service:ajax');
      ajax.request('/test/').then(() => {
        (0, _chai.expect)(false).to.be.true;
      }).catch(error => {
        (0, _chai.expect)((0, _errors.isUnauthorizedError)(error)).to.be.true;
        done();
      });
    });
    (0, _mocha.it)('handles error checking for VersionMismatchError', function (done) {
      server.get('/test/', function () {
        return [400, {
          'Content-Type': 'application/json'
        }, JSON.stringify({
          errors: [{
            type: 'VersionMismatchError',
            statusCode: 400
          }]
        })];
      });
      let ajax = this.owner.lookup('service:ajax');
      ajax.request('/test/').then(() => {
        (0, _chai.expect)(false).to.be.true;
      }).catch(error => {
        (0, _chai.expect)((0, _ajax.isVersionMismatchError)(error)).to.be.true;
        done();
      });
    });
    (0, _mocha.it)('handles error checking for RequestEntityTooLargeError on 413 errors', function (done) {
      stubAjaxEndpoint(server, {}, 413);
      let ajax = this.owner.lookup('service:ajax');
      ajax.request('/test/').then(() => {
        (0, _chai.expect)(false).to.be.true;
      }).catch(error => {
        (0, _chai.expect)((0, _ajax.isRequestEntityTooLargeError)(error)).to.be.true;
        done();
      });
    });
    (0, _mocha.it)('handles error checking for UnsupportedMediaTypeError on 415 errors', function (done) {
      stubAjaxEndpoint(server, {}, 415);
      let ajax = this.owner.lookup('service:ajax');
      ajax.request('/test/').then(() => {
        (0, _chai.expect)(false).to.be.true;
      }).catch(error => {
        (0, _chai.expect)((0, _ajax.isUnsupportedMediaTypeError)(error)).to.be.true;
        done();
      });
    });
    (0, _mocha.it)('handles error checking for MaintenanceError on 503 errors', function (done) {
      stubAjaxEndpoint(server, {}, 503);
      let ajax = this.owner.lookup('service:ajax');
      ajax.request('/test/').then(() => {
        (0, _chai.expect)(false).to.be.true;
      }).catch(error => {
        (0, _chai.expect)((0, _ajax.isMaintenanceError)(error)).to.be.true;
        done();
      });
    });
  });
});
define("ghost-admin/tests/integration/services/config-test", ["pretender", "ghost-admin/utils/ghost-paths", "mocha", "chai", "@ember/test-helpers", "ember-mocha"], function (_pretender, _ghostPaths, _mocha, _chai, _testHelpers, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Integration: Service: config', function () {
    (0, _emberMocha.setupTest)();
    let server;
    beforeEach(function () {
      server = new _pretender.default();
    });
    afterEach(function () {
      server.shutdown();
    });
    (0, _mocha.it)('returns a list of timezones in the expected format', function (done) {
      let service = this.owner.lookup('service:config');
      service.get('availableTimezones').then(function (timezones) {
        (0, _chai.expect)(timezones.length).to.equal(66);
        (0, _chai.expect)(timezones[0].name).to.equal('Pacific/Pago_Pago');
        (0, _chai.expect)(timezones[0].label).to.equal('(GMT -11:00) Midway Island, Samoa');
        (0, _chai.expect)(timezones[1].name).to.equal('Pacific/Honolulu');
        (0, _chai.expect)(timezones[1].label).to.equal('(GMT -10:00) Hawaii');
        done();
      });
    });
    (0, _mocha.it)('normalizes blogUrl to non-trailing-slash', function (done) {
      let stubBlogUrl = function stubBlogUrl(url) {
        server.get(`${(0, _ghostPaths.default)().apiRoot}/config/`, function () {
          return [200, {
            'Content-Type': 'application/json'
          }, JSON.stringify({})];
        });
        server.get(`${(0, _ghostPaths.default)().apiRoot}/site/`, function () {
          return [200, {
            'Content-Type': 'application/json'
          }, JSON.stringify({
            site: {
              url
            }
          })];
        });
      };

      let service = this.owner.lookup('service:config');
      stubBlogUrl('http://localhost:2368/');
      service.fetch().then(() => {
        (0, _chai.expect)(service.get('blogUrl'), 'trailing-slash').to.equal('http://localhost:2368');
      });
      (0, _testHelpers.settled)().then(() => {
        stubBlogUrl('http://localhost:2368');
        service.fetch().then(() => {
          (0, _chai.expect)(service.get('blogUrl'), 'non-trailing-slash').to.equal('http://localhost:2368');
          done();
        });
      });
    });
  });
});
define("ghost-admin/tests/integration/services/feature-test", ["ghost-admin/services/feature", "pretender", "ghost-admin/utils/ghost-paths", "mocha", "chai", "@ember/test-helpers", "ember-mocha"], function (_feature, _pretender, _ghostPaths, _mocha, _chai, _testHelpers, _emberMocha) {
  "use strict";

  function stubSettings(server, labs) {
    let validSave = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;
    let settings = [{
      id: '1',
      type: 'labs',
      key: 'labs',
      value: JSON.stringify(labs)
    }];
    server.get(`${(0, _ghostPaths.default)().apiRoot}/settings/`, function () {
      return [200, {
        'Content-Type': 'application/json'
      }, JSON.stringify({
        settings
      })];
    });
    server.put(`${(0, _ghostPaths.default)().apiRoot}/settings/`, function (request) {
      let statusCode = validSave ? 200 : 400;
      let response = validSave ? request.requestBody : JSON.stringify({
        errors: [{
          message: 'Test Error'
        }]
      });
      return [statusCode, {
        'Content-Type': 'application/json'
      }, response];
    });
  }

  function stubUser(server, accessibility) {
    let validSave = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;
    let users = [{
      id: '1',
      // Add extra properties for the validations
      name: 'Test User',
      email: 'test@example.com',
      accessibility: JSON.stringify(accessibility),
      roles: [{
        id: 1,
        name: 'Owner',
        description: 'Owner'
      }]
    }];
    server.get(`${(0, _ghostPaths.default)().apiRoot}/users/me/`, function () {
      return [200, {
        'Content-Type': 'application/json'
      }, JSON.stringify({
        users
      })];
    });
    server.put(`${(0, _ghostPaths.default)().apiRoot}/users/1/`, function (request) {
      let statusCode = validSave ? 200 : 400;
      let response = validSave ? request.requestBody : JSON.stringify({
        errors: [{
          message: 'Test Error'
        }]
      });
      return [statusCode, {
        'Content-Type': 'application/json'
      }, response];
    });
  }

  function addTestFlag() {
    _feature.default.reopen({
      testFlag: (0, _feature.feature)('testFlag'),
      testUserFlag: (0, _feature.feature)('testUserFlag', {
        user: true
      })
    });
  }

  (0, _mocha.describe)('Integration: Service: feature', function () {
    (0, _emberMocha.setupTest)();
    let server;
    beforeEach(function () {
      server = new _pretender.default();
    });
    afterEach(function () {
      server.shutdown();
    });
    (0, _mocha.it)('loads labs and user settings correctly', async function () {
      stubSettings(server, {
        testFlag: true
      });
      stubUser(server, {
        testUserFlag: true
      });
      addTestFlag();
      let session = this.owner.lookup('service:session');
      await session.populateUser();
      let service = this.owner.lookup('service:feature');
      return service.fetch().then(() => {
        (0, _chai.expect)(service.get('testFlag')).to.be.true;
        (0, _chai.expect)(service.get('testUserFlag')).to.be.true;
      });
    });
    (0, _mocha.it)('returns false for set flag with config false and labs false', async function () {
      stubSettings(server, {
        testFlag: false
      });
      stubUser(server, {});
      addTestFlag();
      let session = this.owner.lookup('service:session');
      await session.populateUser();
      let service = this.owner.lookup('service:feature');
      service.get('config').set('testFlag', false);
      return service.fetch().then(() => {
        (0, _chai.expect)(service.get('labs.testFlag')).to.be.false;
        (0, _chai.expect)(service.get('testFlag')).to.be.false;
      });
    });
    (0, _mocha.it)('returns true for set flag with config true and labs false', async function () {
      stubSettings(server, {
        testFlag: false
      });
      stubUser(server, {});
      addTestFlag();
      let session = this.owner.lookup('service:session');
      await session.populateUser();
      let service = this.owner.lookup('service:feature');
      service.get('config').set('testFlag', true);
      return service.fetch().then(() => {
        (0, _chai.expect)(service.get('labs.testFlag')).to.be.false;
        (0, _chai.expect)(service.get('testFlag')).to.be.true;
      });
    });
    (0, _mocha.it)('returns true for set flag with config false and labs true', async function () {
      stubSettings(server, {
        testFlag: true
      });
      stubUser(server, {});
      addTestFlag();
      let session = this.owner.lookup('service:session');
      await session.populateUser();
      let service = this.owner.lookup('service:feature');
      service.get('config').set('testFlag', false);
      return service.fetch().then(() => {
        (0, _chai.expect)(service.get('labs.testFlag')).to.be.true;
        (0, _chai.expect)(service.get('testFlag')).to.be.true;
      });
    });
    (0, _mocha.it)('returns true for set flag with config true and labs true', async function () {
      stubSettings(server, {
        testFlag: true
      });
      stubUser(server, {});
      addTestFlag();
      let session = this.owner.lookup('service:session');
      await session.populateUser();
      let service = this.owner.lookup('service:feature');
      service.get('config').set('testFlag', true);
      return service.fetch().then(() => {
        (0, _chai.expect)(service.get('labs.testFlag')).to.be.true;
        (0, _chai.expect)(service.get('testFlag')).to.be.true;
      });
    });
    (0, _mocha.it)('returns false for set flag with accessibility false', async function () {
      stubSettings(server, {});
      stubUser(server, {
        testUserFlag: false
      });
      addTestFlag();
      let session = this.owner.lookup('service:session');
      await session.populateUser();
      let service = this.owner.lookup('service:feature');
      return service.fetch().then(() => {
        (0, _chai.expect)(service.get('accessibility.testUserFlag')).to.be.false;
        (0, _chai.expect)(service.get('testUserFlag')).to.be.false;
      });
    });
    (0, _mocha.it)('returns true for set flag with accessibility true', async function () {
      stubSettings(server, {});
      stubUser(server, {
        testUserFlag: true
      });
      addTestFlag();
      let session = this.owner.lookup('service:session');
      await session.populateUser();
      let service = this.owner.lookup('service:feature');
      return service.fetch().then(() => {
        (0, _chai.expect)(service.get('accessibility.testUserFlag')).to.be.true;
        (0, _chai.expect)(service.get('testUserFlag')).to.be.true;
      });
    });
    (0, _mocha.it)('saves labs setting correctly', async function () {
      stubSettings(server, {
        testFlag: false
      });
      stubUser(server, {
        testUserFlag: false
      });
      addTestFlag();
      let session = this.owner.lookup('service:session');
      await session.populateUser();
      let service = this.owner.lookup('service:feature');
      service.get('config').set('testFlag', false);
      return service.fetch().then(() => {
        (0, _chai.expect)(service.get('testFlag')).to.be.false;
        Ember.run(() => {
          service.set('testFlag', true);
        });
        return (0, _testHelpers.settled)().then(() => {
          (0, _chai.expect)(server.handlers[1].numberOfCalls).to.equal(1);
          (0, _chai.expect)(service.get('testFlag')).to.be.true;
        });
      });
    });
    (0, _mocha.it)('saves accessibility setting correctly', async function () {
      stubSettings(server, {});
      stubUser(server, {
        testUserFlag: false
      });
      addTestFlag();
      let session = this.owner.lookup('service:session');
      await session.populateUser();
      let service = this.owner.lookup('service:feature');
      return service.fetch().then(() => {
        (0, _chai.expect)(service.get('testUserFlag')).to.be.false;
        Ember.run(() => {
          service.set('testUserFlag', true);
        });
        return (0, _testHelpers.settled)().then(() => {
          (0, _chai.expect)(server.handlers[3].numberOfCalls).to.equal(1);
          (0, _chai.expect)(service.get('testUserFlag')).to.be.true;
        });
      });
    });
    (0, _mocha.it)('notifies for server errors on labs save', async function () {
      stubSettings(server, {
        testFlag: false
      }, false);
      stubUser(server, {});
      addTestFlag();
      let session = this.owner.lookup('service:session');
      await session.populateUser();
      let service = this.owner.lookup('service:feature');
      service.get('config').set('testFlag', false);
      return service.fetch().then(() => {
        (0, _chai.expect)(service.get('testFlag')).to.be.false;
        Ember.run(() => {
          service.set('testFlag', true);
        });
        return (0, _testHelpers.settled)().then(() => {
          (0, _chai.expect)(server.handlers[1].numberOfCalls, 'PUT call is made').to.equal(1);
          (0, _chai.expect)(service.get('notifications.alerts').length, 'number of alerts shown').to.equal(1);
          (0, _chai.expect)(service.get('testFlag')).to.be.false;
        });
      });
    });
    (0, _mocha.it)('notifies for server errors on accessibility save', async function () {
      stubSettings(server, {});
      stubUser(server, {
        testUserFlag: false
      }, false);
      addTestFlag();
      let session = this.owner.lookup('service:session');
      await session.populateUser();
      let service = this.owner.lookup('service:feature');
      return service.fetch().then(() => {
        (0, _chai.expect)(service.get('testUserFlag')).to.be.false;
        Ember.run(() => {
          service.set('testUserFlag', true);
        });
        return (0, _testHelpers.settled)().then(() => {
          (0, _chai.expect)(server.handlers[3].numberOfCalls, 'PUT call is made').to.equal(1);
          (0, _chai.expect)(service.get('notifications.alerts').length, 'number of alerts shown').to.equal(1);
          (0, _chai.expect)(service.get('testUserFlag')).to.be.false;
        });
      });
    });
    (0, _mocha.it)('notifies for validation errors', async function () {
      stubSettings(server, {
        testFlag: false
      }, true, false);
      stubUser(server, {});
      addTestFlag();
      let session = this.owner.lookup('service:session');
      await session.populateUser();
      let service = this.owner.lookup('service:feature');
      service.get('config').set('testFlag', false);
      return service.fetch().then(() => {
        (0, _chai.expect)(service.get('testFlag')).to.be.false;
        Ember.run(() => {
          (0, _chai.expect)(() => {
            service.set('testFlag', true);
          }, Ember.Error, 'threw validation error');
        });
        return (0, _testHelpers.settled)().then(() => {
          // ensure validation is happening before the API is hit
          (0, _chai.expect)(server.handlers[1].numberOfCalls).to.equal(0);
          (0, _chai.expect)(service.get('testFlag')).to.be.false;
        });
      });
    });
  });
});
define("ghost-admin/tests/integration/services/lazy-loader-test", ["pretender", "mocha", "chai", "ember-mocha"], function (_pretender, _mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Integration: Service: lazy-loader', function () {
    (0, _emberMocha.setupTest)();
    let server;
    let ghostPaths = {
      adminRoot: '/assets/'
    };
    beforeEach(function () {
      server = new _pretender.default();
    });
    afterEach(function () {
      server.shutdown();
    });
    (0, _mocha.it)('loads a script correctly and only once', async function () {
      let subject = this.owner.lookup('service:lazy-loader');
      subject.setProperties({
        ghostPaths,
        scriptPromises: {},
        testing: false
      }); // first load should add script element

      await subject.loadScript('test', 'lazy-test.js').then(() => {}).catch(() => {});
      (0, _chai.expect)(document.querySelectorAll('script[src="/assets/lazy-test.js"]').length, 'no of script tags on first load').to.equal(1); // second load should not add another script element

      await subject.loadScript('test', '/assets/lazy-test.js').then(() => {}).catch(() => {});
      (0, _chai.expect)(document.querySelectorAll('script[src="/assets/lazy-test.js"]').length, 'no of script tags on second load').to.equal(1);
    });
    (0, _mocha.it)('loads styles correctly', function () {
      let subject = this.owner.lookup('service:lazy-loader');
      subject.setProperties({
        ghostPaths,
        testing: false
      });
      return subject.loadStyle('testing', 'style.css').catch(() => {
        // we add a catch handler here because `/assets/style.css` doesn't exist
        (0, _chai.expect)(document.querySelectorAll('#testing-styles').length).to.equal(1);
        (0, _chai.expect)(document.querySelector('#testing-styles').getAttribute('href')).to.equal('/assets/style.css');
      });
    });
  });
});
define("ghost-admin/tests/integration/services/member-import-validator-test", ["pretender", "mocha", "chai", "ember-mocha"], function (_pretender, _mocha, _chai, _emberMocha) {
  "use strict";

  let MembersUtilsStub = Ember.Service.extend({
    isStripeEnabled: true
  });
  (0, _mocha.describe)('Integration: Service: member-import-validator', function () {
    (0, _emberMocha.setupTest)();
    let server;
    beforeEach(function () {
      server = new _pretender.default();
      this.owner.register('service:membersUtils', MembersUtilsStub);
    });
    afterEach(function () {
      server.shutdown();
    });
    (0, _mocha.it)('checks correct data without Stripe customer', async function () {
      let service = this.owner.lookup('service:member-import-validator');
      const mapping = await service.check([{
        name: 'Rish',
        email: 'validemail@example.com'
      }]);
      (0, _chai.expect)(mapping.email).to.equal('email');
    });
    (0, _mocha.describe)('data sampling method', function () {
      (0, _mocha.it)('returns whole data set when sampled size is less then default 30', async function () {
        this.owner.register('service:membersUtils', Ember.Service.extend({
          isStripeEnabled: false
        }));
        let service = this.owner.lookup('service:member-import-validator');
        const result = await service._sampleData([{
          email: 'email@example.com'
        }, {
          email: 'email2@example.com'
        }]);
        (0, _chai.expect)(result.length).to.equal(2);
      });
      (0, _mocha.it)('returns dataset with sample size for non empty values only', async function () {
        this.owner.register('service:membersUtils', Ember.Service.extend({
          isStripeEnabled: false
        }));
        let service = this.owner.lookup('service:member-import-validator');
        let data = [{
          email: null
        }, {
          email: 'email2@example.com'
        }, {
          email: 'email3@example.com'
        }, {
          email: 'email4@example.com'
        }, {
          email: ''
        }];
        const result = await service._sampleData(data, 3);
        (0, _chai.expect)(result.length).to.equal(3);
        (0, _chai.expect)(result[0].email).to.equal('email2@example.com');
        (0, _chai.expect)(result[1].email).to.equal('email3@example.com');
        (0, _chai.expect)(result[2].email).to.equal('email4@example.com');
      });
      (0, _mocha.it)('returns dataset with sample size for non empty values for objects with multiple properties', async function () {
        this.owner.register('service:membersUtils', Ember.Service.extend({
          isStripeEnabled: false
        }));
        let service = this.owner.lookup('service:member-import-validator');
        let data = [{
          email: null,
          other_prop: 'non empty 1'
        }, {
          email: 'email2@example.com',
          other_prop: 'non empty 2'
        }, {
          email: 'email3@example.com',
          other_prop: ''
        }, {
          email: 'email4@example.com'
        }, {
          email: '',
          other_prop: 'non empty 5'
        }];
        const result = await service._sampleData(data, 3);
        (0, _chai.expect)(result.length).to.equal(3);
        (0, _chai.expect)(result[0].email).to.equal('email2@example.com');
        (0, _chai.expect)(result[0].other_prop).to.equal('non empty 1');
        (0, _chai.expect)(result[1].email).to.equal('email3@example.com');
        (0, _chai.expect)(result[1].other_prop).to.equal('non empty 2');
        (0, _chai.expect)(result[2].email).to.equal('email4@example.com');
        (0, _chai.expect)(result[2].other_prop).to.equal('non empty 5');
      });
    });
    (0, _mocha.describe)('data detection method', function () {
      (0, _mocha.it)('correctly detects only email mapping', async function () {
        this.owner.register('service:membersUtils', Ember.Service.extend({
          isStripeEnabled: false
        }));
        let service = this.owner.lookup('service:member-import-validator');

        const result = service._detectDataTypes([{
          correo_electronico: 'email@example.com'
        }, {
          correo_electronico: 'email2@example.com'
        }]);

        (0, _chai.expect)(result.email).to.equal('correo_electronico');
        (0, _chai.expect)(result.stripe_customer_id).to.equal(undefined);
      });
      (0, _mocha.it)('correctly detects only email mapping', async function () {
        this.owner.register('service:membersUtils', Ember.Service.extend({
          isStripeEnabled: false
        }));
        let service = this.owner.lookup('service:member-import-validator');

        const result = service._detectDataTypes([{
          correo_electronico: 'email@example.com',
          stripe_id: ''
        }, {
          correo_electronico: '',
          stripe_id: 'cus_'
        }]);

        (0, _chai.expect)(result.email).to.equal('correo_electronico');
      });
      (0, _mocha.it)('correctly detects variation of "name" mapping', async function () {
        this.owner.register('service:membersUtils', Ember.Service.extend({
          isStripeEnabled: false
        }));
        let service = this.owner.lookup('service:member-import-validator');

        const result = service._detectDataTypes([{
          first_name: 'Rish'
        }]);

        (0, _chai.expect)(result.name).to.equal('first_name');
      });
    });
  });
});
define("ghost-admin/tests/integration/services/slug-generator-test", ["pretender", "ghost-admin/utils/ghost-paths", "mocha", "chai", "ember-mocha"], function (_pretender, _ghostPaths, _mocha, _chai, _emberMocha) {
  "use strict";

  function stubSlugEndpoint(server, type, slug) {
    server.get(`${(0, _ghostPaths.default)().apiRoot}/slugs/:type/:slug/`, function (request) {
      (0, _chai.expect)(request.params.type).to.equal(type);
      (0, _chai.expect)(request.params.slug).to.equal(slug);
      return [200, {
        'Content-Type': 'application/json'
      }, JSON.stringify({
        slugs: [{
          slug: Ember.String.dasherize(slug)
        }]
      })];
    });
  }

  (0, _mocha.describe)('Integration: Service: slug-generator', function () {
    (0, _emberMocha.setupTest)();
    let server;
    beforeEach(function () {
      server = new _pretender.default();
    });
    afterEach(function () {
      server.shutdown();
    });
    (0, _mocha.it)('returns empty if no slug is provided', function (done) {
      let service = this.owner.lookup('service:slug-generator');
      service.generateSlug('post', '').then(function (slug) {
        (0, _chai.expect)(slug).to.equal('');
        done();
      });
    });
    (0, _mocha.it)('calls correct endpoint and returns correct data', function (done) {
      let rawSlug = 'a test post';
      stubSlugEndpoint(server, 'post', rawSlug);
      let service = this.owner.lookup('service:slug-generator');
      service.generateSlug('post', rawSlug).then(function (slug) {
        (0, _chai.expect)(slug).to.equal(Ember.String.dasherize(rawSlug));
        done();
      });
    });
  });
});
define("ghost-admin/tests/integration/services/store-test", ["pretender", "ghost-admin/config/environment", "ghost-admin/utils/ghost-paths", "mocha", "chai", "ember-mocha"], function (_pretender, _environment, _ghostPaths, _mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Integration: Service: store', function () {
    (0, _emberMocha.setupTest)();
    let server;
    beforeEach(function () {
      server = new _pretender.default();
    });
    afterEach(function () {
      server.shutdown();
    });
    (0, _mocha.it)('adds Ghost version header to requests', function (done) {
      let {
        version
      } = _environment.default.APP;
      let store = this.owner.lookup('service:store');
      server.get(`${(0, _ghostPaths.default)().apiRoot}/posts/1/`, function () {
        return [404, {
          'Content-Type': 'application/json'
        }, JSON.stringify({})];
      });
      store.find('post', 1).catch(() => {
        let [request] = server.handledRequests;
        (0, _chai.expect)(request.requestHeaders['X-Ghost-Version']).to.equal(version);
        done();
      });
    });
  });
});
define("ghost-admin/tests/lint/app.lint-test", [], function () {
  "use strict";

  describe('ESLint | app', function () {
    it('adapters/api-key.js', function () {// test passed
    });
    it('adapters/application.js', function () {// test passed
    });
    it('adapters/base.js', function () {// test passed
    });
    it('adapters/custom-theme-setting-list.js', function () {// test passed
    });
    it('adapters/email.js', function () {// test passed
    });
    it('adapters/embedded-relation-adapter.js', function () {// test passed
    });
    it('adapters/label.js', function () {// test passed
    });
    it('adapters/member.js', function () {// test passed
    });
    it('adapters/newsletter.js', function () {// test passed
    });
    it('adapters/offer.js', function () {// test passed
    });
    it('adapters/page.js', function () {// test passed
    });
    it('adapters/post.js', function () {// test passed
    });
    it('adapters/setting.js', function () {// test passed
    });
    it('adapters/tag.js', function () {// test passed
    });
    it('adapters/theme.js', function () {// test passed
    });
    it('adapters/tier.js', function () {// test passed
    });
    it('adapters/user.js', function () {// test passed
    });
    it('app.js', function () {// test passed
    });
    it('authenticators/cookie.js', function () {// test passed
    });
    it('components/aspect-ratio-box.js', function () {// test passed
    });
    it('components/custom-theme-settings/boolean.js', function () {// test passed
    });
    it('components/custom-theme-settings/color.js', function () {// test passed
    });
    it('components/custom-theme-settings/image.js', function () {// test passed
    });
    it('components/custom-theme-settings/select.js', function () {// test passed
    });
    it('components/custom-theme-settings/text.js', function () {// test passed
    });
    it('components/dashboard/charts/anchor.js', function () {// test passed
    });
    it('components/dashboard/charts/engagement.js', function () {// test passed
    });
    it('components/dashboard/charts/overview.js', function () {// test passed
    });
    it('components/dashboard/charts/paid-breakdown.js', function () {// test passed
    });
    it('components/dashboard/charts/paid-mix.js', function () {// test passed
    });
    it('components/dashboard/charts/paid-mrr.js', function () {// test passed
    });
    it('components/dashboard/charts/recents.js', function () {// test passed
    });
    it('components/dashboard/prototype/control-panel.js', function () {// test passed
    });
    it('components/dashboard/resources/newsletter.js', function () {// test passed
    });
    it('components/dashboard/resources/resources.js', function () {// test passed
    });
    it('components/dashboard/resources/staff-picks.js', function () {// test passed
    });
    it('components/dashboard/resources/whats-new.js', function () {// test passed
    });
    it('components/editor/modals/preview.js', function () {// test passed
    });
    it('components/editor/modals/preview/browser.js', function () {// test passed
    });
    it('components/editor/modals/preview/email.js', function () {// test passed
    });
    it('components/editor/modals/preview/mobile.js', function () {// test passed
    });
    it('components/editor/modals/preview/social.js', function () {// test passed
    });
    it('components/editor/modals/publish-flow.js', function () {// test passed
    });
    it('components/editor/modals/publish-flow/complete-with-email-error.js', function () {// test passed
    });
    it('components/editor/modals/publish-flow/confirm.js', function () {// test passed
    });
    it('components/editor/modals/publish-flow/options.js', function () {// test passed
    });
    it('components/editor/modals/update-flow.js', function () {// test passed
    });
    it('components/editor/publish-management.js', function () {// test passed
    });
    it('components/editor/publish-options/publish-at.js', function () {// test passed
    });
    it('components/editor/publish-options/publish-type.js', function () {// test passed
    });
    it('components/epm-modal-container.js', function () {// test passed
    });
    it('components/gh-alert.js', function () {// test passed
    });
    it('components/gh-alerts.js', function () {// test passed
    });
    it('components/gh-basic-dropdown.js', function () {// test passed
    });
    it('components/gh-benefit-item.js', function () {// test passed
    });
    it('components/gh-billing-iframe.js', function () {// test passed
    });
    it('components/gh-billing-modal.js', function () {// test passed
    });
    it('components/gh-billing-update-button.js', function () {// test passed
    });
    it('components/gh-blog-url.js', function () {// test passed
    });
    it('components/gh-brand-settings-form.js', function () {// test passed
    });
    it('components/gh-browser-preview.js', function () {// test passed
    });
    it('components/gh-canvas-header.js', function () {// test passed
    });
    it('components/gh-cm-editor.js', function () {// test passed
    });
    it('components/gh-content-cover.js', function () {// test passed
    });
    it('components/gh-contentfilter.js', function () {// test passed
    });
    it('components/gh-custom-view-title.js', function () {// test passed
    });
    it('components/gh-date-picker.js', function () {// test passed
    });
    it('components/gh-date-time-picker.js', function () {// test passed
    });
    it('components/gh-dropdown-button.js', function () {// test passed
    });
    it('components/gh-dropdown.js', function () {// test passed
    });
    it('components/gh-editor-feature-image.js', function () {// test passed
    });
    it('components/gh-editor-post-status.js', function () {// test passed
    });
    it('components/gh-editor.js', function () {// test passed
    });
    it('components/gh-email-preview-link.js', function () {// test passed
    });
    it('components/gh-error-message.js', function () {// test passed
    });
    it('components/gh-feature-flag.js', function () {// test passed
    });
    it('components/gh-file-input.js', function () {// test passed
    });
    it('components/gh-file-upload.js', function () {// test passed
    });
    it('components/gh-file-uploader.js', function () {// test passed
    });
    it('components/gh-font-selector.js', function () {// test passed
    });
    it('components/gh-form-group.js', function () {// test passed
    });
    it('components/gh-fullscreen-modal.js', function () {// test passed
    });
    it('components/gh-html-iframe.js', function () {// test passed
    });
    it('components/gh-image-uploader.js', function () {// test passed
    });
    it('components/gh-infinity-loader.js', function () {// test passed
    });
    it('components/gh-input-with-select/index.js', function () {// test passed
    });
    it('components/gh-input-with-select/trigger.js', function () {// test passed
    });
    it('components/gh-koenig-editor.js', function () {// test passed
    });
    it('components/gh-launch-wizard/connect-stripe.js', function () {// test passed
    });
    it('components/gh-launch-wizard/customise-design.js', function () {// test passed
    });
    it('components/gh-launch-wizard/finalise.js', function () {// test passed
    });
    it('components/gh-launch-wizard/set-pricing.js', function () {// test passed
    });
    it('components/gh-link-to-custom-views-index.js', function () {// test passed
    });
    it('components/gh-loading-spinner.js', function () {// test passed
    });
    it('components/gh-markdown-editor.js', function () {// test passed
    });
    it('components/gh-member-avatar.js', function () {// test passed
    });
    it('components/gh-member-details.js', function () {// test passed
    });
    it('components/gh-member-label-input.js', function () {// test passed
    });
    it('components/gh-member-settings-form.js', function () {// test passed
    });
    it('components/gh-member-single-label-input.js', function () {// test passed
    });
    it('components/gh-members-filter-count.js', function () {// test passed
    });
    it('components/gh-members-import-mapping-input.js', function () {// test passed
    });
    it('components/gh-members-import-table.js', function () {// test passed
    });
    it('components/gh-members-list-item-column.js', function () {// test passed
    });
    it('components/gh-members-list-item.js', function () {// test passed
    });
    it('components/gh-members-no-members.js', function () {// test passed
    });
    it('components/gh-members-payments-setting.js', function () {// test passed
    });
    it('components/gh-members-recipient-select.js', function () {// test passed
    });
    it('components/gh-members-segment-count.js', function () {// test passed
    });
    it('components/gh-members-segment-select.js', function () {// test passed
    });
    it('components/gh-membership-tiers-alpha.js', function () {// test passed
    });
    it('components/gh-mobile-nav-bar.js', function () {// test passed
    });
    it('components/gh-nav-menu.js', function () {// test passed
    });
    it('components/gh-nav-menu/design.js', function () {// test passed
    });
    it('components/gh-nav-menu/footer.js', function () {// test passed
    });
    it('components/gh-nav-menu/main.js', function () {// test passed
    });
    it('components/gh-navitem-url-input.js', function () {// test passed
    });
    it('components/gh-navitem.js', function () {// test passed
    });
    it('components/gh-notification.js', function () {// test passed
    });
    it('components/gh-notifications.js', function () {// test passed
    });
    it('components/gh-portal-links.js', function () {// test passed
    });
    it('components/gh-post-settings-menu.js', function () {// test passed
    });
    it('components/gh-post-settings-menu/email.js', function () {// test passed
    });
    it('components/gh-post-settings-menu/visibility-segment-select.js', function () {// test passed
    });
    it('components/gh-posts-list-item.js', function () {// test passed
    });
    it('components/gh-power-select/trigger.js', function () {// test passed
    });
    it('components/gh-progress-bar.js', function () {// test passed
    });
    it('components/gh-psm-authors-input.js', function () {// test passed
    });
    it('components/gh-psm-tags-input.js', function () {// test passed
    });
    it('components/gh-psm-template-select.js', function () {// test passed
    });
    it('components/gh-psm-visibility-input.js', function () {// test passed
    });
    it('components/gh-role-selection.js', function () {// test passed
    });
    it('components/gh-scroll-trigger.js', function () {// test passed
    });
    it('components/gh-search-input.js', function () {// test passed
    });
    it('components/gh-simplemde.js', function () {// test passed
    });
    it('components/gh-site-iframe.js', function () {// test passed
    });
    it('components/gh-skip-link.js', function () {// test passed
    });
    it('components/gh-tag-settings-form.js', function () {// test passed
    });
    it('components/gh-task-button.js', function () {// test passed
    });
    it('components/gh-text-input.js', function () {// test passed
    });
    it('components/gh-textarea.js', function () {// test passed
    });
    it('components/gh-theme-error-li.js', function () {// test passed
    });
    it('components/gh-theme-table.js', function () {// test passed
    });
    it('components/gh-tier-card.js', function () {// test passed
    });
    it('components/gh-tiers-price-billingperiod.js', function () {// test passed
    });
    it('components/gh-timezone-select.js', function () {// test passed
    });
    it('components/gh-token-input.js', function () {// test passed
    });
    it('components/gh-token-input/label-token.js', function () {// test passed
    });
    it('components/gh-token-input/select-multiple.js', function () {// test passed
    });
    it('components/gh-token-input/tag-token.js', function () {// test passed
    });
    it('components/gh-token-input/trigger.js', function () {// test passed
    });
    it('components/gh-trim-focus-input.js', function () {// test passed
    });
    it('components/gh-unsplash-photo.js', function () {// test passed
    });
    it('components/gh-unsplash.js', function () {// test passed
    });
    it('components/gh-uploader.js', function () {// test passed
    });
    it('components/gh-url-input.js', function () {// test passed
    });
    it('components/gh-url-preview.js', function () {// test passed
    });
    it('components/gh-user-active.js', function () {// test passed
    });
    it('components/gh-user-invited.js', function () {// test passed
    });
    it('components/gh-user-list-item.js', function () {// test passed
    });
    it('components/gh-validation-status-container.js', function () {// test passed
    });
    it('components/gh-view-title.js', function () {// test passed
    });
    it('components/liquid-container.js', function () {// test passed
    });
    it('components/member/newsletter-preference.js', function () {// test passed
    });
    it('components/members-activity/event-type-filter.js', function () {// test passed
    });
    it('components/members-activity/member-filter.js', function () {// test passed
    });
    it('components/members/filter-value.js', function () {// test passed
    });
    it('components/members/filter.js', function () {// test passed
    });
    it('components/modal-base.js', function () {// test passed
    });
    it('components/modal-delete-all.js', function () {// test passed
    });
    it('components/modal-delete-integration.js', function () {// test passed
    });
    it('components/modal-delete-member.js', function () {// test passed
    });
    it('components/modal-delete-snippet.js', function () {// test passed
    });
    it('components/modal-delete-tag.js', function () {// test passed
    });
    it('components/modal-delete-user.js', function () {// test passed
    });
    it('components/modal-delete-webhook.js', function () {// test passed
    });
    it('components/modal-disconnect-stripe.js', function () {// test passed
    });
    it('components/modal-early-access.js', function () {// test passed
    });
    it('components/modal-email-design-settings.js', function () {// test passed
    });
    it('components/modal-free-membership-settings.js', function () {// test passed
    });
    it('components/modal-impersonate-member.js', function () {// test passed
    });
    it('components/modal-import-members.js', function () {// test passed
    });
    it('components/modal-import-members/csv-file-mapping.js', function () {// test passed
    });
    it('components/modal-import-members/csv-file-select.js', function () {// test passed
    });
    it('components/modal-invite-new-user.js', function () {// test passed
    });
    it('components/modal-leave-settings.js', function () {// test passed
    });
    it('components/modal-markdown-help.js', function () {// test passed
    });
    it('components/modal-member-tier.js', function () {// test passed
    });
    it('components/modal-members-label-form.js', function () {// test passed
    });
    it('components/modal-portal-settings.js', function () {// test passed
    });
    it('components/modal-re-authenticate.js', function () {// test passed
    });
    it('components/modal-regenerate-key.js', function () {// test passed
    });
    it('components/modal-regenerate-token.js', function () {// test passed
    });
    it('components/modal-reset-all-passwords.js', function () {// test passed
    });
    it('components/modal-select-user-role.js', function () {// test passed
    });
    it('components/modal-stripe-connect.js', function () {// test passed
    });
    it('components/modal-suspend-user.js', function () {// test passed
    });
    it('components/modal-tier.js', function () {// test passed
    });
    it('components/modal-transfer-owner.js', function () {// test passed
    });
    it('components/modal-unsubscribe-members.js', function () {// test passed
    });
    it('components/modal-unsuspend-user.js', function () {// test passed
    });
    it('components/modal-update-snippet.js', function () {// test passed
    });
    it('components/modal-upgrade-host-limit.js', function () {// test passed
    });
    it('components/modal-upgrade-unsuspend-user-host-limit.js', function () {// test passed
    });
    it('components/modal-upload-image.js', function () {// test passed
    });
    it('components/modal-webhook-form.js', function () {// test passed
    });
    it('components/modal-whats-new.js', function () {// test passed
    });
    it('components/modals/custom-view-form.js', function () {// test passed
    });
    it('components/modals/delete-post.js', function () {// test passed
    });
    it('components/modals/design/confirm-delete-theme.js', function () {// test passed
    });
    it('components/modals/design/install-theme.js', function () {// test passed
    });
    it('components/modals/design/upload-theme.js', function () {// test passed
    });
    it('components/modals/design/view-theme.js', function () {// test passed
    });
    it('components/modals/email-preview.js', function () {// test passed
    });
    it('components/modals/members/bulk-add-label.js', function () {// test passed
    });
    it('components/modals/members/bulk-delete.js', function () {// test passed
    });
    it('components/modals/members/bulk-remove-label.js', function () {// test passed
    });
    it('components/modals/members/bulk-unsubscribe.js', function () {// test passed
    });
    it('components/modals/new-custom-integration.js', function () {// test passed
    });
    it('components/modals/newsletters/edit.js', function () {// test passed
    });
    it('components/modals/newsletters/edit/design.js', function () {// test passed
    });
    it('components/modals/newsletters/edit/preview.js', function () {// test passed
    });
    it('components/modals/newsletters/edit/settings.js', function () {// test passed
    });
    it('components/modals/newsletters/new.js', function () {// test passed
    });
    it('components/modals/newsletters/verify-newsletter-email.js', function () {// test passed
    });
    it('components/modals/offers/archive.js', function () {// test passed
    });
    it('components/modals/offers/link.js', function () {// test passed
    });
    it('components/modals/offers/unarchive.js', function () {// test passed
    });
    it('components/modals/search.js', function () {// test passed
    });
    it('components/modals/tiers/archive.js', function () {// test passed
    });
    it('components/modals/tiers/unarchive.js', function () {// test passed
    });
    it('components/power-select-vertical-collection-options.js', function () {// test passed
    });
    it('components/settings/form-fields/accent-color.js', function () {// test passed
    });
    it('components/settings/form-fields/publication-cover.js', function () {// test passed
    });
    it('components/settings/form-fields/publication-icon.js', function () {// test passed
    });
    it('components/settings/form-fields/publication-logo.js', function () {// test passed
    });
    it('components/settings/form-fields/site-description.js', function () {// test passed
    });
    it('components/settings/members-default-post-access.js', function () {// test passed
    });
    it('components/settings/members-email/default-recipients-select.js', function () {// test passed
    });
    it('components/settings/members-subscription-access.js', function () {// test passed
    });
    it('components/settings/members/archive-tier.js', function () {// test passed
    });
    it('components/settings/newsletters.js', function () {// test passed
    });
    it('components/settings/newsletters/newsletter-management.js', function () {// test passed
    });
    it('components/tiers/segment-select.js', function () {// test passed
    });
    it('controllers/application.js', function () {// test passed
    });
    it('controllers/billing.js', function () {// test passed
    });
    it('controllers/dashboard.js', function () {// test passed
    });
    it('controllers/designsandbox.js', function () {// test passed
    });
    it('controllers/editor.js', function () {// test passed
    });
    it('controllers/editor/edit-loading.js', function () {// test passed
    });
    it('controllers/error.js', function () {// test passed
    });
    it('controllers/home.js', function () {// test passed
    });
    it('controllers/launch.js', function () {// test passed
    });
    it('controllers/member.js', function () {// test passed
    });
    it('controllers/members-activity.js', function () {// test passed
    });
    it('controllers/members.js', function () {// test passed
    });
    it('controllers/members/import.js', function () {// test passed
    });
    it('controllers/offer.js', function () {// test passed
    });
    it('controllers/offers.js', function () {// test passed
    });
    it('controllers/pages-loading.js', function () {// test passed
    });
    it('controllers/pages.js', function () {// test passed
    });
    it('controllers/posts-loading.js', function () {// test passed
    });
    it('controllers/posts.js', function () {// test passed
    });
    it('controllers/reset.js', function () {// test passed
    });
    it('controllers/settings.js', function () {// test passed
    });
    it('controllers/settings/code-injection.js', function () {// test passed
    });
    it('controllers/settings/design.js', function () {// test passed
    });
    it('controllers/settings/design/change-theme.js', function () {// test passed
    });
    it('controllers/settings/design/change-theme/install.js', function () {// test passed
    });
    it('controllers/settings/design/index.js', function () {// test passed
    });
    it('controllers/settings/general.js', function () {// test passed
    });
    it('controllers/settings/integration.js', function () {// test passed
    });
    it('controllers/settings/integration/webhooks/edit.js', function () {// test passed
    });
    it('controllers/settings/integration/webhooks/new.js', function () {// test passed
    });
    it('controllers/settings/integrations.js', function () {// test passed
    });
    it('controllers/settings/integrations/amp.js', function () {// test passed
    });
    it('controllers/settings/integrations/firstpromoter.js', function () {// test passed
    });
    it('controllers/settings/integrations/slack.js', function () {// test passed
    });
    it('controllers/settings/integrations/unsplash.js', function () {// test passed
    });
    it('controllers/settings/integrations/zapier.js', function () {// test passed
    });
    it('controllers/settings/labs.js', function () {// test passed
    });
    it('controllers/settings/membership.js', function () {// test passed
    });
    it('controllers/settings/navigation.js', function () {// test passed
    });
    it('controllers/settings/newsletters.js', function () {// test passed
    });
    it('controllers/settings/staff/index.js', function () {// test passed
    });
    it('controllers/settings/staff/user-loading.js', function () {// test passed
    });
    it('controllers/settings/staff/user.js', function () {// test passed
    });
    it('controllers/settings/tier.js', function () {// test passed
    });
    it('controllers/settings/tiers.js', function () {// test passed
    });
    it('controllers/setup.js', function () {// test passed
    });
    it('controllers/setup/done.js', function () {// test passed
    });
    it('controllers/signin.js', function () {// test passed
    });
    it('controllers/signup.js', function () {// test passed
    });
    it('controllers/site.js', function () {// test passed
    });
    it('controllers/tag.js', function () {// test passed
    });
    it('controllers/tags.js', function () {// test passed
    });
    it('controllers/whatsnew.js', function () {// test passed
    });
    it('errors/email-failed-error.js', function () {// test passed
    });
    it('errors/member-import-error.js', function () {// test passed
    });
    it('helpers/accent-color-background.js', function () {// test passed
    });
    it('helpers/author-names.js', function () {// test passed
    });
    it('helpers/background-image-style.js', function () {// test passed
    });
    it('helpers/capitalize-first-letter.js', function () {// test passed
    });
    it('helpers/currency-symbol.js', function () {// test passed
    });
    it('helpers/enable-developer-experiments.js', function () {// test passed
    });
    it('helpers/event-name.js', function () {// test passed
    });
    it('helpers/feature.js', function () {// test passed
    });
    it('helpers/first-name.js', function () {// test passed
    });
    it('helpers/format-number.js', function () {// test passed
    });
    it('helpers/full-email-address.js', function () {// test passed
    });
    it('helpers/get-setting.js', function () {// test passed
    });
    it('helpers/gh-count-characters.js', function () {// test passed
    });
    it('helpers/gh-count-down-characters.js', function () {// test passed
    });
    it('helpers/gh-format-post-time.js', function () {// test passed
    });
    it('helpers/gh-pluralize.js', function () {// test passed
    });
    it('helpers/gh-price-amount.js', function () {// test passed
    });
    it('helpers/gh-user-can-admin.js', function () {// test passed
    });
    it('helpers/hex-adjust.js', function () {// test passed
    });
    it('helpers/hex-contrast.js', function () {// test passed
    });
    it('helpers/highlighted-text.js', function () {// test passed
    });
    it('helpers/humanize-setting-key.js', function () {// test passed
    });
    it('helpers/integration-icon-style.js', function () {// test passed
    });
    it('helpers/is-moment-today.js', function () {// test passed
    });
    it('helpers/members-count-fetcher.js', function () {// test passed
    });
    it('helpers/members-event-fetcher.js', function () {// test passed
    });
    it('helpers/members-event-filter.js', function () {// test passed
    });
    it('helpers/moment-site-tz.js', function () {// test passed
    });
    it('helpers/most-recently-updated.js', function () {// test passed
    });
    it('helpers/noop.js', function () {// test passed
    });
    it('helpers/parse-member-event.js', function () {// test passed
    });
    it('helpers/post-author-names.js', function () {// test passed
    });
    it('helpers/publish-options.js', function () {// test passed
    });
    it('helpers/query-selector.js', function () {// test passed
    });
    it('helpers/reset-query-params.js', function () {// test passed
    });
    it('helpers/set-has.js', function () {// test passed
    });
    it('helpers/set-query-params.js', function () {// test passed
    });
    it('helpers/site-icon-style.js', function () {// test passed
    });
    it('helpers/toggle-feature.js', function () {// test passed
    });
    it('helpers/ui-btn-span.js', function () {// test passed
    });
    it('helpers/ui-btn.js', function () {// test passed
    });
    it('helpers/ui-text.js', function () {// test passed
    });
    it('initializers/ember-simple-auth.js', function () {// test passed
    });
    it('initializers/trailing-hash.js', function () {// test passed
    });
    it('initializers/upgrade-status.js', function () {// test passed
    });
    it('mixins/body-event-listener.js', function () {// test passed
    });
    it('mixins/dropdown-mixin.js', function () {// test passed
    });
    it('mixins/shortcuts-route.js', function () {// test passed
    });
    it('mixins/shortcuts.js', function () {// test passed
    });
    it('mixins/text-input.js', function () {// test passed
    });
    it('mixins/validation-engine.js', function () {// test passed
    });
    it('mixins/validation-state.js', function () {// test passed
    });
    it('models/action.js', function () {// test passed
    });
    it('models/api-key.js', function () {// test passed
    });
    it('models/base.js', function () {// test passed
    });
    it('models/custom-theme-setting-list.js', function () {// test passed
    });
    it('models/custom-theme-setting.js', function () {// test passed
    });
    it('models/email.js', function () {// test passed
    });
    it('models/integration.js', function () {// test passed
    });
    it('models/invite.js', function () {// test passed
    });
    it('models/label.js', function () {// test passed
    });
    it('models/member-subscription.js', function () {// test passed
    });
    it('models/member-tier.js', function () {// test passed
    });
    it('models/member.js', function () {// test passed
    });
    it('models/navigation-item.js', function () {// test passed
    });
    it('models/newsletter.js', function () {// test passed
    });
    it('models/notification.js', function () {// test passed
    });
    it('models/offer.js', function () {// test passed
    });
    it('models/page.js', function () {// test passed
    });
    it('models/post.js', function () {// test passed
    });
    it('models/role.js', function () {// test passed
    });
    it('models/setting.js', function () {// test passed
    });
    it('models/snippet.js', function () {// test passed
    });
    it('models/tag.js', function () {// test passed
    });
    it('models/theme.js', function () {// test passed
    });
    it('models/tier-benefit-item.js', function () {// test passed
    });
    it('models/tier.js', function () {// test passed
    });
    it('models/user.js', function () {// test passed
    });
    it('models/webhook.js', function () {// test passed
    });
    it('modifiers/autofocus.js', function () {// test passed
    });
    it('modifiers/movable.js', function () {// test passed
    });
    it('modifiers/on-resize.js', function () {// test passed
    });
    it('modifiers/on-scroll.js', function () {// test passed
    });
    it('modifiers/ratio-zoom.js', function () {// test passed
    });
    it('modifiers/scroll-into-view.js', function () {// test passed
    });
    it('modifiers/scroll-to.js', function () {// test passed
    });
    it('modifiers/scroll-top.js', function () {// test passed
    });
    it('router.js', function () {// test passed
    });
    it('routes/admin.js', function () {// test passed
    });
    it('routes/application.js', function () {// test passed
    });
    it('routes/authenticated.js', function () {// test passed
    });
    it('routes/dashboard.js', function () {// test passed
    });
    it('routes/designsandbox.js', function () {// test passed
    });
    it('routes/editor.js', function () {// test passed
    });
    it('routes/editor/edit.js', function () {// test passed
    });
    it('routes/editor/index.js', function () {// test passed
    });
    it('routes/editor/new.js', function () {// test passed
    });
    it('routes/error404.js', function () {// test passed
    });
    it('routes/home.js', function () {// test passed
    });
    it('routes/launch.js', function () {// test passed
    });
    it('routes/member.js', function () {// test passed
    });
    it('routes/member/new.js', function () {// test passed
    });
    it('routes/members-activity.js', function () {// test passed
    });
    it('routes/members.js', function () {// test passed
    });
    it('routes/members/import.js', function () {// test passed
    });
    it('routes/offer.js', function () {// test passed
    });
    it('routes/offer/new.js', function () {// test passed
    });
    it('routes/offers.js', function () {// test passed
    });
    it('routes/pages.js', function () {// test passed
    });
    it('routes/posts.js', function () {// test passed
    });
    it('routes/pro.js', function () {// test passed
    });
    it('routes/reset.js', function () {// test passed
    });
    it('routes/settings.js', function () {// test passed
    });
    it('routes/settings/code-injection.js', function () {// test passed
    });
    it('routes/settings/design.js', function () {// test passed
    });
    it('routes/settings/design/change-theme.js', function () {// test passed
    });
    it('routes/settings/design/change-theme/install.js', function () {// test passed
    });
    it('routes/settings/design/change-theme/view.js', function () {// test passed
    });
    it('routes/settings/design/index.js', function () {// test passed
    });
    it('routes/settings/general.js', function () {// test passed
    });
    it('routes/settings/integration.js', function () {// test passed
    });
    it('routes/settings/integration/webhooks/edit.js', function () {// test passed
    });
    it('routes/settings/integration/webhooks/new.js', function () {// test passed
    });
    it('routes/settings/integrations.js', function () {// test passed
    });
    it('routes/settings/integrations/amp.js', function () {// test passed
    });
    it('routes/settings/integrations/firstpromoter.js', function () {// test passed
    });
    it('routes/settings/integrations/new.js', function () {// test passed
    });
    it('routes/settings/integrations/slack.js', function () {// test passed
    });
    it('routes/settings/integrations/unsplash.js', function () {// test passed
    });
    it('routes/settings/integrations/zapier.js', function () {// test passed
    });
    it('routes/settings/labs.js', function () {// test passed
    });
    it('routes/settings/members-email.js', function () {// test passed
    });
    it('routes/settings/membership.js', function () {// test passed
    });
    it('routes/settings/navigation.js', function () {// test passed
    });
    it('routes/settings/newsletters.js', function () {// test passed
    });
    it('routes/settings/newsletters/edit-newsletter.js', function () {// test passed
    });
    it('routes/settings/newsletters/new-newsletter.js', function () {// test passed
    });
    it('routes/settings/staff/index.js', function () {// test passed
    });
    it('routes/settings/staff/user.js', function () {// test passed
    });
    it('routes/settings/theme-install.js', function () {// test passed
    });
    it('routes/settings/tier/new.js', function () {// test passed
    });
    it('routes/setup.js', function () {// test passed
    });
    it('routes/setup/done.js', function () {// test passed
    });
    it('routes/setup/index.js', function () {// test passed
    });
    it('routes/signin.js', function () {// test passed
    });
    it('routes/signout.js', function () {// test passed
    });
    it('routes/signup.js', function () {// test passed
    });
    it('routes/site.js', function () {// test passed
    });
    it('routes/tag.js', function () {// test passed
    });
    it('routes/tag/new.js', function () {// test passed
    });
    it('routes/tags.js', function () {// test passed
    });
    it('routes/unauthenticated.js', function () {// test passed
    });
    it('routes/whatsnew.js', function () {// test passed
    });
    it('serializers/action.js', function () {// test passed
    });
    it('serializers/api-key.js', function () {// test passed
    });
    it('serializers/application.js', function () {// test passed
    });
    it('serializers/custom-theme-setting-list.js', function () {// test passed
    });
    it('serializers/email.js', function () {// test passed
    });
    it('serializers/integration.js', function () {// test passed
    });
    it('serializers/invite.js', function () {// test passed
    });
    it('serializers/label.js', function () {// test passed
    });
    it('serializers/member.js', function () {// test passed
    });
    it('serializers/newsletter.js', function () {// test passed
    });
    it('serializers/notification.js', function () {// test passed
    });
    it('serializers/page.js', function () {// test passed
    });
    it('serializers/post.js', function () {// test passed
    });
    it('serializers/role.js', function () {// test passed
    });
    it('serializers/setting.js', function () {// test passed
    });
    it('serializers/tag.js', function () {// test passed
    });
    it('serializers/theme.js', function () {// test passed
    });
    it('serializers/tier.js', function () {// test passed
    });
    it('serializers/user.js', function () {// test passed
    });
    it('serializers/webhook.js', function () {// test passed
    });
    it('services/ajax.js', function () {// test passed
    });
    it('services/billing.js', function () {// test passed
    });
    it('services/clock.js', function () {// test passed
    });
    it('services/config.js', function () {// test passed
    });
    it('services/custom-theme-settings.js', function () {// test passed
    });
    it('services/custom-views.js', function () {// test passed
    });
    it('services/dashboard-mocks.js', function () {// test passed
    });
    it('services/dashboard-stats.js', function () {// test passed
    });
    it('services/data-cache.js', function () {// test passed
    });
    it('services/dropdown.js', function () {// test passed
    });
    it('services/event-bus.js', function () {// test passed
    });
    it('services/feature.js', function () {// test passed
    });
    it('services/frontend.js', function () {// test passed
    });
    it('services/ghost-paths.js', function () {// test passed
    });
    it('services/lazy-loader.js', function () {// test passed
    });
    it('services/limit.js', function () {// test passed
    });
    it('services/media-queries.js', function () {// test passed
    });
    it('services/media.js', function () {// test passed
    });
    it('services/member-import-validator.js', function () {// test passed
    });
    it('services/members-count-cache.js', function () {// test passed
    });
    it('services/members-stats.js', function () {// test passed
    });
    it('services/members-utils.js', function () {// test passed
    });
    it('services/modals.js', function () {// test passed
    });
    it('services/navigation.js', function () {// test passed
    });
    it('services/notifications.js', function () {// test passed
    });
    it('services/resize-detector.js', function () {// test passed
    });
    it('services/session.js', function () {// test passed
    });
    it('services/settings.js', function () {// test passed
    });
    it('services/slug-generator.js', function () {// test passed
    });
    it('services/tenor.js', function () {// test passed
    });
    it('services/theme-management.js', function () {// test passed
    });
    it('services/ui.js', function () {// test passed
    });
    it('services/unsplash.js', function () {// test passed
    });
    it('services/upgrade-status.js', function () {// test passed
    });
    it('services/utils.js', function () {// test passed
    });
    it('services/whats-new.js', function () {// test passed
    });
    it('session-stores/application.js', function () {// test passed
    });
    it('transforms/facebook-url-user.js', function () {// test passed
    });
    it('transforms/json-string.js', function () {// test passed
    });
    it('transforms/member-subscription.js', function () {// test passed
    });
    it('transforms/member-tier.js', function () {// test passed
    });
    it('transforms/members-segment-string.js', function () {// test passed
    });
    it('transforms/moment-date.js', function () {// test passed
    });
    it('transforms/moment-utc.js', function () {// test passed
    });
    it('transforms/navigation-settings.js', function () {// test passed
    });
    it('transforms/raw.js', function () {// test passed
    });
    it('transforms/tier-benefits.js', function () {// test passed
    });
    it('transforms/twitter-url-user.js', function () {// test passed
    });
    it('transforms/visibility-string.js', function () {// test passed
    });
    it('transitions.js', function () {// test passed
    });
    it('transitions/wormhole.js', function () {// test passed
    });
    it('utils/bound-one-way.js', function () {// test passed
    });
    it('utils/caja-sanitizers.js', function () {// test passed
    });
    it('utils/copy-text-to-clipboard.js', function () {// test passed
    });
    it('utils/ctrl-or-cmd.js', function () {// test passed
    });
    it('utils/currency.js', function () {// test passed
    });
    it('utils/flatten-grouped-options.js', function () {// test passed
    });
    it('utils/format-markdown.js', function () {// test passed
    });
    it('utils/get-scroll-parent.js', function () {// test passed
    });
    it('utils/ghost-paths.js', function () {// test passed
    });
    it('utils/isNumber.js', function () {// test passed
    });
    it('utils/link-component.js', function () {// test passed
    });
    it('utils/password-generator.js', function () {// test passed
    });
    it('utils/publish-options.js', function () {// test passed
    });
    it('utils/route.js', function () {// test passed
    });
    it('utils/slug-url.js', function () {// test passed
    });
    it('utils/window-proxy.js', function () {// test passed
    });
    it('validators/base.js', function () {// test passed
    });
    it('validators/custom-view.js', function () {// test passed
    });
    it('validators/integration.js', function () {// test passed
    });
    it('validators/invite-user.js', function () {// test passed
    });
    it('validators/label.js', function () {// test passed
    });
    it('validators/member.js', function () {// test passed
    });
    it('validators/mixins/password.js', function () {// test passed
    });
    it('validators/nav-item.js', function () {// test passed
    });
    it('validators/new-user.js', function () {// test passed
    });
    it('validators/newsletter.js', function () {// test passed
    });
    it('validators/offer.js', function () {// test passed
    });
    it('validators/post.js', function () {// test passed
    });
    it('validators/reset.js', function () {// test passed
    });
    it('validators/setting.js', function () {// test passed
    });
    it('validators/setup.js', function () {// test passed
    });
    it('validators/signin.js', function () {// test passed
    });
    it('validators/signup.js', function () {// test passed
    });
    it('validators/snippet.js', function () {// test passed
    });
    it('validators/subscriber.js', function () {// test passed
    });
    it('validators/tag-settings.js', function () {// test passed
    });
    it('validators/tier-benefit-item.js', function () {// test passed
    });
    it('validators/tier.js', function () {// test passed
    });
    it('validators/user.js', function () {// test passed
    });
    it('validators/webhook.js', function () {// test passed
    });
  });
});
define("ghost-admin/tests/lint/tests.lint-test", [], function () {
  "use strict";

  describe('ESLint | tests', function () {
    it('acceptance/authentication-test.js', function () {// test passed
    });
    it('acceptance/content-test.js', function () {// test passed
    });
    it('acceptance/custom-post-templates-test.js', function () {// test passed
    });
    it('acceptance/dashboard-test.js', function () {// test passed
    });
    it('acceptance/editor-test.js', function () {// test passed
    });
    it('acceptance/editor/publish-flow-test.js', function () {// test passed
    });
    it('acceptance/error-handling-test.js', function () {// test passed
    });
    it('acceptance/launch-flow-test.js', function () {// test passed
    });
    it('acceptance/members-activity-test.js', function () {// test passed
    });
    it('acceptance/members-test.js', function () {// test passed
    });
    it('acceptance/members/details-test.js', function () {// test passed
    });
    it('acceptance/members/filter-test.js', function () {// test passed
    });
    it('acceptance/members/import-test.js', function () {// test passed
    });
    it('acceptance/offers-test.js', function () {// test passed
    });
    it('acceptance/password-reset-test.js', function () {// test passed
    });
    it('acceptance/settings/amp-test.js', function () {// test passed
    });
    it('acceptance/settings/code-injection-test.js', function () {// test passed
    });
    it('acceptance/settings/design-test.js', function () {// test passed
    });
    it('acceptance/settings/general-test.js', function () {// test passed
    });
    it('acceptance/settings/integrations-test.js', function () {// test passed
    });
    it('acceptance/settings/labs-test.js', function () {// test passed
    });
    it('acceptance/settings/membership-test.js', function () {// test passed
    });
    it('acceptance/settings/navigation-test.js', function () {// test passed
    });
    it('acceptance/settings/newsletters-test.js', function () {// test passed
    });
    it('acceptance/settings/slack-test.js', function () {// test passed
    });
    it('acceptance/settings/tags-test.js', function () {// test passed
    });
    it('acceptance/settings/unsplash-test.js', function () {// test passed
    });
    it('acceptance/settings/zapier-test.js', function () {// test passed
    });
    it('acceptance/setup-test.js', function () {// test passed
    });
    it('acceptance/signin-test.js', function () {// test passed
    });
    it('acceptance/signup-test.js', function () {// test passed
    });
    it('acceptance/staff-test.js', function () {// test passed
    });
    it('helpers/file-upload.js', function () {// test passed
    });
    it('helpers/labs-flag.js', function () {// test passed
    });
    it('helpers/login-as-role.js', function () {// test passed
    });
    it('helpers/mailgun.js', function () {// test passed
    });
    it('helpers/members.js', function () {// test passed
    });
    it('helpers/newsletters.js', function () {// test passed
    });
    it('helpers/stripe.js', function () {// test passed
    });
    it('helpers/visit.js', function () {// test passed
    });
    it('integration/adapters/tag-test.js', function () {// test passed
    });
    it('integration/adapters/user-test.js', function () {// test passed
    });
    it('integration/components/gh-alert-test.js', function () {// test passed
    });
    it('integration/components/gh-alerts-test.js', function () {// test passed
    });
    it('integration/components/gh-basic-dropdown-test.js', function () {// test passed
    });
    it('integration/components/gh-cm-editor-test.js', function () {// test passed
    });
    it('integration/components/gh-date-picker-test.js', function () {// test passed
    });
    it('integration/components/gh-date-time-picker-test.js', function () {// test passed
    });
    it('integration/components/gh-distribution-action-select-test.js', function () {// test passed
    });
    it('integration/components/gh-feature-flag-test.js', function () {// test passed
    });
    it('integration/components/gh-file-uploader-test.js', function () {// test passed
    });
    it('integration/components/gh-image-uploader-test.js', function () {// test passed
    });
    it('integration/components/gh-image-uploader-with-preview-test.js', function () {// test passed
    });
    it('integration/components/gh-member-avatar-test.js', function () {// test passed
    });
    it('integration/components/gh-members-import-table-test.js', function () {// test passed
    });
    it('integration/components/gh-navitem-test.js', function () {// test passed
    });
    it('integration/components/gh-navitem-url-input-test.js', function () {// test passed
    });
    it('integration/components/gh-notification-test.js', function () {// test passed
    });
    it('integration/components/gh-notifications-test.js', function () {// test passed
    });
    it('integration/components/gh-psm-tags-input-test.js', function () {// test passed
    });
    it('integration/components/gh-psm-template-select-test.js', function () {// test passed
    });
    it('integration/components/gh-psm-visibility-input-test.js', function () {// test passed
    });
    it('integration/components/gh-search-input-test.js', function () {// test passed
    });
    it('integration/components/gh-tag-settings-form-test.js', function () {// test passed
    });
    it('integration/components/gh-task-button-test.js', function () {// test passed
    });
    it('integration/components/gh-theme-table-test.js', function () {// test passed
    });
    it('integration/components/gh-timezone-select-test.js', function () {// test passed
    });
    it('integration/components/gh-trim-focus-input-test.js', function () {// test passed
    });
    it('integration/components/gh-unsplash-photo-test.js', function () {// test passed
    });
    it('integration/components/gh-unsplash-test.js', function () {// test passed
    });
    it('integration/components/gh-uploader-test.js', function () {// test passed
    });
    it('integration/components/gh-validation-status-container-test.js', function () {// test passed
    });
    it('integration/components/gh-whats-new-test.js', function () {// test passed
    });
    it('integration/components/koenig-toolbar-test.js', function () {// test passed
    });
    it('integration/components/modal-import-members-test.js', function () {// test passed
    });
    it('integration/components/modal-transfer-owner-test.js', function () {// test passed
    });
    it('integration/helpers/background-image-style-test.js', function () {// test passed
    });
    it('integration/helpers/clean-basic-html-test.js', function () {// test passed
    });
    it('integration/helpers/gh-format-post-time-test.js', function () {// test passed
    });
    it('integration/helpers/gh-url-preview-test.js', function () {// test passed
    });
    it('integration/helpers/sanitize-html-test.js', function () {// test passed
    });
    it('integration/services/ajax-test.js', function () {// test passed
    });
    it('integration/services/config-test.js', function () {// test passed
    });
    it('integration/services/feature-test.js', function () {// test passed
    });
    it('integration/services/lazy-loader-test.js', function () {// test passed
    });
    it('integration/services/member-import-validator-test.js', function () {// test passed
    });
    it('integration/services/slug-generator-test.js', function () {// test passed
    });
    it('integration/services/store-test.js', function () {// test passed
    });
    it('test-helper.js', function () {// test passed
    });
    it('unit/authenticators/cookie-test.js', function () {// test passed
    });
    it('unit/components/gh-post-settings-menu-test.js', function () {// test passed
    });
    it('unit/controllers/editor-test.js', function () {// test passed
    });
    it('unit/controllers/settings/design-test.js', function () {// test passed
    });
    it('unit/helpers/gh-count-characters-test.js', function () {// test passed
    });
    it('unit/helpers/gh-count-down-characters-test.js', function () {// test passed
    });
    it('unit/helpers/gh-user-can-admin-test.js', function () {// test passed
    });
    it('unit/helpers/highlighted-text-test.js', function () {// test passed
    });
    it('unit/helpers/most-recently-updated-test.js', function () {// test passed
    });
    it('unit/mixins/validation-engine-test.js', function () {// test passed
    });
    it('unit/models/invite-test.js', function () {// test passed
    });
    it('unit/models/member-test.js', function () {// test passed
    });
    it('unit/models/navigation-item-test.js', function () {// test passed
    });
    it('unit/models/post-test.js', function () {// test passed
    });
    it('unit/models/role-test.js', function () {// test passed
    });
    it('unit/models/setting-test.js', function () {// test passed
    });
    it('unit/models/tag-test.js', function () {// test passed
    });
    it('unit/models/user-test.js', function () {// test passed
    });
    it('unit/serializers/notification-test.js', function () {// test passed
    });
    it('unit/services/event-bus-test.js', function () {// test passed
    });
    it('unit/services/limit-test.js', function () {// test passed
    });
    it('unit/services/member-stats-test.js', function () {// test passed
    });
    it('unit/services/notifications-test.js', function () {// test passed
    });
    it('unit/services/unsplash-test.js', function () {// test passed
    });
    it('unit/transforms/facebook-url-user-test.js', function () {// test passed
    });
    it('unit/transforms/json-string-test.js', function () {// test passed
    });
    it('unit/transforms/navigation-settings-test.js', function () {// test passed
    });
    it('unit/transforms/twitter-url-user-test.js', function () {// test passed
    });
    it('unit/utils/ghost-paths-test.js', function () {// test passed
    });
    it('unit/validators/nav-item-test.js', function () {// test passed
    });
    it('unit/validators/post-test.js', function () {// test passed
    });
    it('unit/validators/tag-settings-test.js', function () {// test passed
    });
  });
});
define("ghost-admin/tests/test-helper", ["ghost-admin/app", "ghost-admin/config/environment", "ember-raf-scheduler/test-support/register-waiter", "ember-exam/test-support/start", "@ember/test-helpers", "chai", "chai-dom"], function (_app, _environment, _registerWaiter, _start, _testHelpers, _chai, _chaiDom) {
  "use strict";

  _chai.default.use(_chaiDom.default);

  (0, _testHelpers.setApplication)(_app.default.create(_environment.default.APP));
  (0, _registerWaiter.default)();
  mocha.setup({
    timeout: 15000,
    slow: 500
  });
  (0, _start.default)();
});
define("ghost-admin/tests/unit/authenticators/cookie-test", ["ghost-admin/utils/ghost-paths", "sinon", "mocha", "chai", "ember-mocha"], function (_ghostPaths, _sinon, _mocha, _chai, _emberMocha) {
  "use strict";

  const mockAjax = Ember.Service.extend({
    skipSessionDeletion: false,

    init() {
      this._super(...arguments);

      this.post = _sinon.default.stub().resolves();
      this.del = _sinon.default.stub().resolves();
    }

  });
  const mockConfig = Ember.Service.extend({
    init() {
      this._super(...arguments);

      this.fetchAuthenticated = _sinon.default.stub().resolves();
    }

  });
  const mockFeature = Ember.Service.extend({
    init() {
      this._super(...arguments);

      this.fetch = _sinon.default.stub().resolves();
    }

  });
  const mockSettings = Ember.Service.extend({
    init() {
      this._super(...arguments);

      this.fetch = _sinon.default.stub().resolves();
    }

  });
  const mockGhostPaths = Ember.Service.extend({
    apiRoot: (0, _ghostPaths.default)().apiRoot
  });
  (0, _mocha.describe)('Unit: Authenticator: cookie', () => {
    (0, _emberMocha.setupTest)();
    (0, _mocha.beforeEach)(function () {
      this.owner.register('service:ajax', mockAjax);
      this.owner.register('service:config', mockConfig);
      this.owner.register('service:feature', mockFeature);
      this.owner.register('service:settings', mockSettings);
      this.owner.register('service:ghost-paths', mockGhostPaths);
    });
    (0, _mocha.describe)('#restore', function () {
      (0, _mocha.it)('returns a resolving promise', function () {
        return this.owner.lookup('authenticator:cookie').restore();
      });
    });
    (0, _mocha.describe)('#authenticate', function () {
      (0, _mocha.it)('posts the username and password to the sessionEndpoint and returns the promise', function () {
        let authenticator = this.owner.lookup('authenticator:cookie');
        let post = authenticator.ajax.post;
        return authenticator.authenticate('AzureDiamond', 'hunter2').then(() => {
          (0, _chai.expect)(post.args[0][0]).to.equal(`${(0, _ghostPaths.default)().apiRoot}/session`);
          (0, _chai.expect)(post.args[0][1]).to.deep.include({
            data: {
              username: 'AzureDiamond',
              password: 'hunter2'
            }
          });
          (0, _chai.expect)(post.args[0][1]).to.deep.include({
            dataType: 'text'
          });
          (0, _chai.expect)(post.args[0][1]).to.deep.include({
            contentType: 'application/json;charset=utf-8'
          });
        });
      });
    });
    (0, _mocha.describe)('#invalidate', function () {
      (0, _mocha.it)('makes a delete request to the sessionEndpoint', function () {
        let authenticator = this.owner.lookup('authenticator:cookie');
        let del = authenticator.ajax.del;
        return authenticator.invalidate().then(() => {
          (0, _chai.expect)(del.args[0][0]).to.equal(`${(0, _ghostPaths.default)().apiRoot}/session`);
        });
      });
    });
  });
});
// /* eslint-disable camelcase */
// import EmberObject from '@ember/object';
// import RSVP from 'rsvp';
// import boundOneWay from 'ghost-admin/utils/bound-one-way';
// import {describe, it} from 'mocha';
// import {expect} from 'chai';
// import {run} from '@ember/runloop';
// import {setupComponentTest} from 'ember-mocha';
// function K() {
//     return this;
// }
// TODO: convert to integration tests
// (commented out because top-level describe.skip was tripping up ember-mocha)
// describe('Unit: Component: post-settings-menu', function () {
//     setupComponentTest('gh-post-settings-menu', {
//         needs: ['service:notifications', 'service:slug-generator', 'service:settings']
//     });
//     it('slugValue is one-way bound to post.slug', function () {
//         let component = this.subject({
//             post: EmberObject.create({
//                 slug: 'a-slug'
//             })
//         });
//         expect(component.get('post.slug')).to.equal('a-slug');
//         expect(component.get('slugValue')).to.equal('a-slug');
//         run(function () {
//             component.set('post.slug', 'changed-slug');
//             expect(component.get('slugValue')).to.equal('changed-slug');
//         });
//         run(function () {
//             component.set('slugValue', 'changed-directly');
//             expect(component.get('post.slug')).to.equal('changed-slug');
//             expect(component.get('slugValue')).to.equal('changed-directly');
//         });
//         run(function () {
//             // test that the one-way binding is still in place
//             component.set('post.slug', 'should-update');
//             expect(component.get('slugValue')).to.equal('should-update');
//         });
//     });
//     it('metaTitleScratch is one-way bound to post.metaTitle', function () {
//         let component = this.subject({
//             post: EmberObject.extend({
//                 metaTitle: 'a title',
//                 metaTitleScratch: boundOneWay('metaTitle')
//             }).create()
//         });
//         expect(component.get('post.metaTitle')).to.equal('a title');
//         expect(component.get('metaTitleScratch')).to.equal('a title');
//         run(function () {
//             component.set('post.metaTitle', 'a different title');
//             expect(component.get('metaTitleScratch')).to.equal('a different title');
//         });
//         run(function () {
//             component.set('metaTitleScratch', 'changed directly');
//             expect(component.get('post.metaTitle')).to.equal('a different title');
//             expect(component.get('post.metaTitleScratch')).to.equal('changed directly');
//         });
//         run(function () {
//             // test that the one-way binding is still in place
//             component.set('post.metaTitle', 'should update');
//             expect(component.get('metaTitleScratch')).to.equal('should update');
//         });
//     });
//     it('metaDescriptionScratch is one-way bound to post.metaDescription', function () {
//         let component = this.subject({
//             post: EmberObject.extend({
//                 metaDescription: 'a description',
//                 metaDescriptionScratch: boundOneWay('metaDescription')
//             }).create()
//         });
//         expect(component.get('post.metaDescription')).to.equal('a description');
//         expect(component.get('metaDescriptionScratch')).to.equal('a description');
//         run(function () {
//             component.set('post.metaDescription', 'a different description');
//             expect(component.get('metaDescriptionScratch')).to.equal('a different description');
//         });
//         run(function () {
//             component.set('metaDescriptionScratch', 'changed directly');
//             expect(component.get('post.metaDescription')).to.equal('a different description');
//             expect(component.get('metaDescriptionScratch')).to.equal('changed directly');
//         });
//         run(function () {
//             // test that the one-way binding is still in place
//             component.set('post.metaDescription', 'should update');
//             expect(component.get('metaDescriptionScratch')).to.equal('should update');
//         });
//     });
//     describe('seoTitle', function () {
//         it('should be the metaTitle if one exists', function () {
//             let component = this.subject({
//                 post: EmberObject.extend({
//                     titleScratch: 'should not be used',
//                     metaTitle: 'a meta-title',
//                     metaTitleScratch: boundOneWay('metaTitle')
//                 }).create()
//             });
//             expect(component.get('seoTitle')).to.equal('a meta-title');
//         });
//         it('should default to the title if an explicit meta-title does not exist', function () {
//             let component = this.subject({
//                 post: EmberObject.create({
//                     titleScratch: 'should be the meta-title'
//                 })
//             });
//             expect(component.get('seoTitle')).to.equal('should be the meta-title');
//         });
//         it('should be the metaTitle if both title and metaTitle exist', function () {
//             let component = this.subject({
//                 post: EmberObject.extend({
//                     titleScratch: 'a title',
//                     metaTitle: 'a meta-title',
//                     metaTitleScratch: boundOneWay('metaTitle')
//                 }).create()
//             });
//             expect(component.get('seoTitle')).to.equal('a meta-title');
//         });
//         it('should revert to the title if explicit metaTitle is removed', function () {
//             let component = this.subject({
//                 post: EmberObject.extend({
//                     titleScratch: 'a title',
//                     metaTitle: 'a meta-title',
//                     metaTitleScratch: boundOneWay('metaTitle')
//                 }).create()
//             });
//             expect(component.get('seoTitle')).to.equal('a meta-title');
//             run(function () {
//                 component.set('post.metaTitle', '');
//                 expect(component.get('seoTitle')).to.equal('a title');
//             });
//         });
//         it('should truncate to 70 characters with an appended ellipsis', function () {
//             let longTitle = new Array(100).join('a');
//             let component = this.subject({
//                 post: EmberObject.create()
//             });
//             expect(longTitle.length).to.equal(99);
//             run(function () {
//                 let expected = `${longTitle.substr(0, 70)}&hellip;`;
//                 component.set('metaTitleScratch', longTitle);
//                 expect(component.get('seoTitle').toString().length).to.equal(78);
//                 expect(component.get('seoTitle').toString()).to.equal(expected);
//             });
//         });
//     });
//     describe('seoDescription', function () {
//         it('should be the metaDescription if one exists', function () {
//             let component = this.subject({
//                 post: EmberObject.extend({
//                     metaDescription: 'a description',
//                     metaDescriptionScratch: boundOneWay('metaDescription')
//                 }).create()
//             });
//             expect(component.get('seoDescription')).to.equal('a description');
//         });
//         it('should be generated from the rendered mobiledoc if not explicitly set', function () {
//             let component = this.subject({
//                 post: EmberObject.extend({
//                     metaDescription: null,
//                     metaDescriptionScratch: boundOneWay('metaDescription'),
//                     author: RSVP.resolve(),
//                     init() {
//                         this._super(...arguments);
//                         this.scratch = {
//                             cards: [
//                                 ['markdown-card', {
//                                     markdown: '# This is a <strong>test</strong> <script>foo</script>'
//                                 }]
//                             ]
//                         };
//                     }
//                 }).create()
//             });
//             expect(component.get('seoDescription')).to.equal('This is a test');
//         });
//         it('should truncate to 156 characters with an appended ellipsis', function () {
//             let longDescription = new Array(200).join('a');
//             let component = this.subject({
//                 post: EmberObject.create()
//             });
//             expect(longDescription.length).to.equal(199);
//             run(function () {
//                 let expected = `${longDescription.substr(0, 156)}&hellip;`;
//                 component.set('metaDescriptionScratch', longDescription);
//                 expect(component.get('seoDescription').toString().length).to.equal(164);
//                 expect(component.get('seoDescription').toString()).to.equal(expected);
//             });
//         });
//     });
//     describe('seoURL', function () {
//         it('should be the URL of the blog if no post slug exists', function () {
//             let component = this.subject({
//                 config: EmberObject.create({blogUrl: 'http://my-ghost-blog.com'}),
//                 post: EmberObject.create()
//             });
//             expect(component.get('seoURL')).to.equal('http://my-ghost-blog.com/');
//         });
//         it('should be the URL of the blog plus the post slug', function () {
//             let component = this.subject({
//                 config: EmberObject.create({blogUrl: 'http://my-ghost-blog.com'}),
//                 post: EmberObject.create({slug: 'post-slug'})
//             });
//             expect(component.get('seoURL')).to.equal('http://my-ghost-blog.com/post-slug/');
//         });
//         it('should update when the post slug changes', function () {
//             let component = this.subject({
//                 config: EmberObject.create({blogUrl: 'http://my-ghost-blog.com'}),
//                 post: EmberObject.create({slug: 'post-slug'})
//             });
//             expect(component.get('seoURL')).to.equal('http://my-ghost-blog.com/post-slug/');
//             run(function () {
//                 component.set('post.slug', 'changed-slug');
//                 expect(component.get('seoURL')).to.equal('http://my-ghost-blog.com/changed-slug/');
//             });
//         });
//         it('should truncate a long URL to 70 characters with an appended ellipsis', function () {
//             let blogURL = 'http://my-ghost-blog.com';
//             let longSlug = new Array(75).join('a');
//             let component = this.subject({
//                 config: EmberObject.create({blogUrl: blogURL}),
//                 post: EmberObject.create({slug: longSlug})
//             });
//             let expected;
//             expect(longSlug.length).to.equal(74);
//             expected = `${blogURL}/${longSlug}/`;
//             expected = `${expected.substr(0, 70)}&hellip;`;
//             expect(component.get('seoURL').toString().length).to.equal(78);
//             expect(component.get('seoURL').toString()).to.equal(expected);
//         });
//     });
//     describe('toggleFeatured', function () {
//         it('should toggle the featured property', function () {
//             let component = this.subject({
//                 post: EmberObject.create({
//                     featured: false,
//                     isNew: true
//                 })
//             });
//             run(function () {
//                 component.send('toggleFeatured');
//                 expect(component.get('post.featured')).to.be.ok;
//             });
//         });
//         it('should not save the post if it is still new', function () {
//             let component = this.subject({
//                 post: EmberObject.create({
//                     featured: false,
//                     isNew: true,
//                     save() {
//                         this.incrementProperty('saved');
//                         return RSVP.resolve();
//                     }
//                 })
//             });
//             run(function () {
//                 component.send('toggleFeatured');
//                 expect(component.get('post.featured')).to.be.ok;
//                 expect(component.get('post.saved')).to.not.be.ok;
//             });
//         });
//         it('should save the post if it is not new', function () {
//             let component = this.subject({
//                 post: EmberObject.create({
//                     featured: false,
//                     isNew: false,
//                     save() {
//                         this.incrementProperty('saved');
//                         return RSVP.resolve();
//                     }
//                 })
//             });
//             run(function () {
//                 component.send('toggleFeatured');
//                 expect(component.get('post.featured')).to.be.ok;
//                 expect(component.get('post.saved')).to.equal(1);
//             });
//         });
//     });
//     describe('updateSlug', function () {
//         it('should reset slugValue to the previous slug when the new slug is blank or unchanged', function () {
//             let component = this.subject({
//                 post: EmberObject.create({
//                     slug: 'slug'
//                 })
//             });
//             run(function () {
//                 // unchanged
//                 component.set('slugValue', 'slug');
//                 component.send('updateSlug', component.get('slugValue'));
//                 expect(component.get('post.slug')).to.equal('slug');
//                 expect(component.get('slugValue')).to.equal('slug');
//             });
//             run(function () {
//                 // unchanged after trim
//                 component.set('slugValue', 'slug  ');
//                 component.send('updateSlug', component.get('slugValue'));
//                 expect(component.get('post.slug')).to.equal('slug');
//                 expect(component.get('slugValue')).to.equal('slug');
//             });
//             run(function () {
//                 // blank
//                 component.set('slugValue', '');
//                 component.send('updateSlug', component.get('slugValue'));
//                 expect(component.get('post.slug')).to.equal('slug');
//                 expect(component.get('slugValue')).to.equal('slug');
//             });
//         });
//         it('should not set a new slug if the server-generated slug matches existing slug', function (done) {
//             let component = this.subject({
//                 slugGenerator: EmberObject.create({
//                     generateSlug(slugType, str) {
//                         let promise = RSVP.resolve(str.split('#')[0]);
//                         this.set('lastPromise', promise);
//                         return promise;
//                     }
//                 }),
//                 post: EmberObject.create({
//                     slug: 'whatever'
//                 })
//             });
//             run(function () {
//                 component.set('slugValue', 'whatever#slug');
//                 component.send('updateSlug', component.get('slugValue'));
//                 RSVP.resolve(component.get('lastPromise')).then(function () {
//                     expect(component.get('post.slug')).to.equal('whatever');
//                     done();
//                 }).catch(done);
//             });
//         });
//         it('should not set a new slug if the only change is to the appended increment value', function (done) {
//             let component = this.subject({
//                 slugGenerator: EmberObject.create({
//                     generateSlug(slugType, str) {
//                         let sanitizedStr = str.replace(/[^a-zA-Z]/g, '');
//                         let promise = RSVP.resolve(`${sanitizedStr}-2`);
//                         this.set('lastPromise', promise);
//                         return promise;
//                     }
//                 }),
//                 post: EmberObject.create({
//                     slug: 'whatever'
//                 })
//             });
//             run(function () {
//                 component.set('slugValue', 'whatever!');
//                 component.send('updateSlug', component.get('slugValue'));
//                 RSVP.resolve(component.get('lastPromise')).then(function () {
//                     expect(component.get('post.slug')).to.equal('whatever');
//                     done();
//                 }).catch(done);
//             });
//         });
//         it('should set the slug if the new slug is different', function (done) {
//             let component = this.subject({
//                 slugGenerator: EmberObject.create({
//                     generateSlug(slugType, str) {
//                         let promise = RSVP.resolve(str);
//                         this.set('lastPromise', promise);
//                         return promise;
//                     }
//                 }),
//                 post: EmberObject.create({
//                     slug: 'whatever',
//                     save: K
//                 })
//             });
//             run(function () {
//                 component.set('slugValue', 'changed');
//                 component.send('updateSlug', component.get('slugValue'));
//                 RSVP.resolve(component.get('lastPromise')).then(function () {
//                     expect(component.get('post.slug')).to.equal('changed');
//                     done();
//                 }).catch(done);
//             });
//         });
//         it('should save the post when the slug changes and the post is not new', function (done) {
//             let component = this.subject({
//                 slugGenerator: EmberObject.create({
//                     generateSlug(slugType, str) {
//                         let promise = RSVP.resolve(str);
//                         this.set('lastPromise', promise);
//                         return promise;
//                     }
//                 }),
//                 post: EmberObject.create({
//                     slug: 'whatever',
//                     saved: 0,
//                     isNew: false,
//                     save() {
//                         this.incrementProperty('saved');
//                     }
//                 })
//             });
//             run(function () {
//                 component.set('slugValue', 'changed');
//                 component.send('updateSlug', component.get('slugValue'));
//                 RSVP.resolve(component.get('lastPromise')).then(function () {
//                     expect(component.get('post.slug')).to.equal('changed');
//                     expect(component.get('post.saved')).to.equal(1);
//                     done();
//                 }).catch(done);
//             });
//         });
//         it('should not save the post when the slug changes and the post is new', function (done) {
//             let component = this.subject({
//                 slugGenerator: EmberObject.create({
//                     generateSlug(slugType, str) {
//                         let promise = RSVP.resolve(str);
//                         this.set('lastPromise', promise);
//                         return promise;
//                     }
//                 }),
//                 post: EmberObject.create({
//                     slug: 'whatever',
//                     saved: 0,
//                     isNew: true,
//                     save() {
//                         this.incrementProperty('saved');
//                     }
//                 })
//             });
//             run(function () {
//                 component.set('slugValue', 'changed');
//                 component.send('updateSlug', component.get('slugValue'));
//                 RSVP.resolve(component.get('lastPromise')).then(function () {
//                     expect(component.get('post.slug')).to.equal('changed');
//                     expect(component.get('post.saved')).to.equal(0);
//                     done();
//                 }).catch(done);
//             });
//         });
//     });
// });
define("ghost-admin/tests/unit/components/gh-post-settings-menu-test", [], function () {
  "use strict";
});
define("ghost-admin/tests/unit/controllers/editor-test", ["mocha", "chai", "@ember/test-helpers", "ember-mocha", "ember-concurrency"], function (_mocha, _chai, _testHelpers, _emberMocha, _emberConcurrency) {
  "use strict";

  (0, _mocha.describe)('Unit: Controller: editor', function () {
    (0, _emberMocha.setupTest)();
    (0, _mocha.describe)('generateSlug', function () {
      (0, _mocha.it)('should generate a slug and set it on the post', async function () {
        let controller = this.owner.lookup('controller:editor');
        controller.set('slugGenerator', Ember.Object.create({
          generateSlug(slugType, str) {
            return Ember.RSVP.resolve(`${str}-slug`);
          }

        }));
        controller.set('post', Ember.Object.create({
          slug: ''
        }));
        controller.set('post.titleScratch', 'title');
        await (0, _testHelpers.settled)();
        (0, _chai.expect)(controller.get('post.slug')).to.equal('');
        await controller.generateSlugTask.perform();
        (0, _chai.expect)(controller.get('post.slug')).to.equal('title-slug');
      });
      (0, _mocha.it)('should not set the destination if the title is "(Untitled)" and the post already has a slug', async function () {
        let controller = this.owner.lookup('controller:editor');
        controller.set('slugGenerator', Ember.Object.create({
          generateSlug(slugType, str) {
            return Ember.RSVP.resolve(`${str}-slug`);
          }

        }));
        controller.set('post', Ember.Object.create({
          slug: 'whatever'
        }));
        (0, _chai.expect)(controller.get('post.slug')).to.equal('whatever');
        controller.set('post.titleScratch', '(Untitled)');
        await controller.generateSlugTask.perform();
        (0, _chai.expect)(controller.get('post.slug')).to.equal('whatever');
      });
    });
    (0, _mocha.describe)('saveTitleTask', function () {
      beforeEach(function () {
        this.controller = this.owner.lookup('controller:editor');
        this.controller.set('target', {
          send() {}

        });
      });
      (0, _mocha.it)('should invoke generateSlug if the post is new and a title has not been set', async function () {
        let {
          controller
        } = this;
        controller.set('target', {
          send() {}

        });
        Ember.defineProperty(controller, 'generateSlugTask', (0, _emberConcurrency.task)(function* () {
          this.set('post.slug', 'test-slug');
          yield Ember.RSVP.resolve();
        }));
        controller.set('post', Ember.Object.create({
          isNew: true
        }));
        (0, _chai.expect)(controller.get('post.isNew')).to.be.true;
        (0, _chai.expect)(controller.get('post.titleScratch')).to.not.be.ok;
        controller.set('post.titleScratch', 'test');
        await controller.saveTitleTask.perform();
        (0, _chai.expect)(controller.get('post.titleScratch')).to.equal('test');
        (0, _chai.expect)(controller.get('post.slug')).to.equal('test-slug');
      });
      (0, _mocha.it)('should invoke generateSlug if the post is not new and it\'s title is "(Untitled)"', async function () {
        let {
          controller
        } = this;
        controller.set('target', {
          send() {}

        });
        Ember.defineProperty(controller, 'generateSlugTask', (0, _emberConcurrency.task)(function* () {
          this.set('post.slug', 'test-slug');
          yield Ember.RSVP.resolve();
        }));
        controller.set('post', Ember.Object.create({
          isNew: false,
          title: '(Untitled)'
        }));
        (0, _chai.expect)(controller.get('post.isNew')).to.be.false;
        (0, _chai.expect)(controller.get('post.titleScratch')).to.not.be.ok;
        controller.set('post.titleScratch', 'New Title');
        await controller.saveTitleTask.perform();
        (0, _chai.expect)(controller.get('post.titleScratch')).to.equal('New Title');
        (0, _chai.expect)(controller.get('post.slug')).to.equal('test-slug');
      });
      (0, _mocha.it)('should not invoke generateSlug if the post is new but has a title', async function () {
        let {
          controller
        } = this;
        controller.set('target', {
          send() {}

        });
        Ember.defineProperty(controller, 'generateSlugTask', (0, _emberConcurrency.task)(function* () {
          (0, _chai.expect)(false, 'generateSlug should not be called').to.equal(true);
          yield Ember.RSVP.resolve();
        }));
        controller.set('post', Ember.Object.create({
          isNew: true,
          title: 'a title'
        }));
        (0, _chai.expect)(controller.get('post.isNew')).to.be.true;
        (0, _chai.expect)(controller.get('post.title')).to.equal('a title');
        (0, _chai.expect)(controller.get('post.titleScratch')).to.not.be.ok;
        controller.set('post.titleScratch', 'test');
        await controller.saveTitleTask.perform();
        (0, _chai.expect)(controller.get('post.titleScratch')).to.equal('test');
        (0, _chai.expect)(controller.get('post.slug')).to.not.be.ok;
      });
      (0, _mocha.it)('should not invoke generateSlug if the post is not new and the title is not "(Untitled)"', async function () {
        let {
          controller
        } = this;
        controller.set('target', {
          send() {}

        });
        Ember.defineProperty(controller, 'generateSlugTask', (0, _emberConcurrency.task)(function* () {
          (0, _chai.expect)(false, 'generateSlug should not be called').to.equal(true);
          yield Ember.RSVP.resolve();
        }));
        controller.set('post', Ember.Object.create({
          isNew: false
        }));
        (0, _chai.expect)(controller.get('post.isNew')).to.be.false;
        (0, _chai.expect)(controller.get('post.title')).to.not.be.ok;
        controller.set('post.titleScratch', 'title');
        await controller.saveTitleTask.perform();
        (0, _chai.expect)(controller.get('post.titleScratch')).to.equal('title');
        (0, _chai.expect)(controller.get('post.slug')).to.not.be.ok;
      });
    });
  });
});
define("ghost-admin/tests/unit/controllers/settings/design-test", ["ghost-admin/models/navigation-item", "chai", "mocha", "ember-mocha"], function (_navigationItem, _chai, _mocha, _emberMocha) {
  "use strict";

  // const navSettingJSON = `[
  //     {"label":"Home","url":"/"},
  //     {"label":"JS Test","url":"javascript:alert('hello');"},
  //     {"label":"About","url":"/about"},
  //     {"label":"Sub Folder","url":"/blah/blah"},
  //     {"label":"Telephone","url":"tel:01234-567890"},
  //     {"label":"Mailto","url":"mailto:test@example.com"},
  //     {"label":"External","url":"https://example.com/testing?query=test#anchor"},
  //     {"label":"No Protocol","url":"//example.com"}
  // ]`;
  _mocha.describe.skip('Unit: Controller: settings/design', function () {
    (0, _emberMocha.setupTest)();
    (0, _mocha.it)('blogUrl: captures config and ensures trailing slash', function () {
      let ctrl = this.owner.lookup('controller:settings/design');
      ctrl.set('config.blogUrl', 'http://localhost:2368/blog');
      (0, _chai.expect)(ctrl.get('blogUrl')).to.equal('http://localhost:2368/blog/');
    });
    (0, _mocha.it)('init: creates a new navigation item', function () {
      let ctrl = this.owner.lookup('controller:settings/design');
      Ember.run(() => {
        (0, _chai.expect)(ctrl.get('newNavItem')).to.exist;
        (0, _chai.expect)(ctrl.get('newNavItem.isNew')).to.be.true;
      });
    });
    (0, _mocha.it)('blogUrl: captures config and ensures trailing slash', function () {
      let ctrl = this.owner.lookup('controller:settings/design');
      ctrl.set('config.blogUrl', 'http://localhost:2368/blog');
      (0, _chai.expect)(ctrl.get('blogUrl')).to.equal('http://localhost:2368/blog/');
    });
    (0, _mocha.it)('save: validates nav items', function (done) {
      let ctrl = this.owner.lookup('controller:settings/design');
      Ember.run(() => {
        ctrl.set('settings', Ember.Object.create({
          navigation: [_navigationItem.default.create({
            label: 'First',
            url: '/'
          }), _navigationItem.default.create({
            label: '',
            url: '/second'
          }), _navigationItem.default.create({
            label: 'Third',
            url: ''
          })]
        })); // blank item won't get added because the last item is incomplete

        (0, _chai.expect)(ctrl.get('settings.navigation.length')).to.equal(3);
        ctrl.get('save').perform().then(function passedValidation() {
          (0, _chai.assert)(false, 'navigationItems weren\'t validated on save');
          done();
        }).catch(function failedValidation() {
          let navItems = ctrl.get('settings.navigation');
          (0, _chai.expect)(navItems[0].get('errors').toArray()).to.be.empty;
          (0, _chai.expect)(navItems[1].get('errors.firstObject.attribute')).to.equal('label');
          (0, _chai.expect)(navItems[2].get('errors.firstObject.attribute')).to.equal('url');
          done();
        });
      });
    });
    (0, _mocha.it)('save: ignores blank last item when saving', function (done) {
      let ctrl = this.owner.lookup('controller:settings/design');
      Ember.run(() => {
        ctrl.set('settings', Ember.Object.create({
          navigation: [_navigationItem.default.create({
            label: 'First',
            url: '/'
          }), _navigationItem.default.create({
            label: '',
            url: ''
          })]
        }));
        (0, _chai.expect)(ctrl.get('settings.navigation.length')).to.equal(2);
        ctrl.get('save').perform().then(function passedValidation() {
          (0, _chai.assert)(false, 'navigationItems weren\'t validated on save');
          done();
        }).catch(function failedValidation() {
          let navItems = ctrl.get('settings.navigation');
          (0, _chai.expect)(navItems[0].get('errors').toArray()).to.be.empty;
          done();
        });
      });
    });
    (0, _mocha.it)('action - addNavItem: adds item to navigationItems', function () {
      let ctrl = this.owner.lookup('controller:settings/design');
      Ember.run(() => {
        ctrl.set('settings', Ember.Object.create({
          navigation: [_navigationItem.default.create({
            label: 'First',
            url: '/first',
            last: true
          })]
        }));
      });
      (0, _chai.expect)(ctrl.get('settings.navigation.length')).to.equal(1);
      ctrl.set('newNavItem.label', 'New');
      ctrl.set('newNavItem.url', '/new');
      Ember.run(() => {
        ctrl.send('addNavItem', ctrl.get('newNavItem'));
      });
      (0, _chai.expect)(ctrl.get('settings.navigation.length')).to.equal(2);
      (0, _chai.expect)(ctrl.get('settings.navigation.lastObject.label')).to.equal('New');
      (0, _chai.expect)(ctrl.get('settings.navigation.lastObject.url')).to.equal('/new');
      (0, _chai.expect)(ctrl.get('settings.navigation.lastObject.isNew')).to.be.false;
      (0, _chai.expect)(ctrl.get('newNavItem.label')).to.be.empty;
      (0, _chai.expect)(ctrl.get('newNavItem.url')).to.be.empty;
      (0, _chai.expect)(ctrl.get('newNavItem.isNew')).to.be.true;
    });
    (0, _mocha.it)('action - addNavItem: doesn\'t insert new item if last object is incomplete', function () {
      let ctrl = this.owner.lookup('controller:settings/design');
      Ember.run(() => {
        ctrl.set('settings', Ember.Object.create({
          navigation: [_navigationItem.default.create({
            label: '',
            url: '',
            last: true
          })]
        }));
        (0, _chai.expect)(ctrl.get('settings.navigation.length')).to.equal(1);
        ctrl.send('addNavItem', ctrl.get('settings.navigation.lastObject'));
        (0, _chai.expect)(ctrl.get('settings.navigation.length')).to.equal(1);
      });
    });
    (0, _mocha.it)('action - deleteNavItem: removes item from navigationItems', function () {
      let ctrl = this.owner.lookup('controller:settings/design');
      let navItems = [_navigationItem.default.create({
        label: 'First',
        url: '/first'
      }), _navigationItem.default.create({
        label: 'Second',
        url: '/second',
        last: true
      })];
      Ember.run(() => {
        ctrl.set('settings', Ember.Object.create({
          navigation: navItems
        }));
        (0, _chai.expect)(ctrl.get('settings.navigation').mapBy('label')).to.deep.equal(['First', 'Second']);
        ctrl.send('deleteNavItem', ctrl.get('settings.navigation.firstObject'));
        (0, _chai.expect)(ctrl.get('settings.navigation').mapBy('label')).to.deep.equal(['Second']);
      });
    });
    (0, _mocha.it)('action - updateUrl: updates URL on navigationItem', function () {
      let ctrl = this.owner.lookup('controller:settings/design');
      let navItems = [_navigationItem.default.create({
        label: 'First',
        url: '/first'
      }), _navigationItem.default.create({
        label: 'Second',
        url: '/second',
        last: true
      })];
      Ember.run(() => {
        ctrl.set('settings', Ember.Object.create({
          navigation: navItems
        }));
        (0, _chai.expect)(ctrl.get('settings.navigation').mapBy('url')).to.deep.equal(['/first', '/second']);
        ctrl.send('updateUrl', '/new', ctrl.get('settings.navigation.firstObject'));
        (0, _chai.expect)(ctrl.get('settings.navigation').mapBy('url')).to.deep.equal(['/new', '/second']);
      });
    });
  });
});
define("ghost-admin/tests/unit/helpers/gh-count-characters-test", ["ghost-admin/helpers/gh-count-characters", "mocha", "chai"], function (_ghCountCharacters, _mocha, _chai) {
  "use strict";

  (0, _mocha.describe)('Unit: Helper: gh-count-characters', function () {
    let defaultStyle = 'color: rgb(69, 195, 46);';
    let errorStyle = 'color: rgb(240, 82, 48);';
    (0, _mocha.it)('counts remaining chars', function () {
      let result = (0, _ghCountCharacters.countCharacters)(['test']);
      (0, _chai.expect)(result.string).to.equal(`<span class="word-count" style="${defaultStyle}">196</span>`);
    });
    (0, _mocha.it)('warns when nearing limit', function () {
      let result = (0, _ghCountCharacters.countCharacters)([Array(195 + 1).join('x')]);
      (0, _chai.expect)(result.string).to.equal(`<span class="word-count" style="${errorStyle}">5</span>`);
    });
    (0, _mocha.it)('indicates too many chars', function () {
      let result = (0, _ghCountCharacters.countCharacters)([Array(205 + 1).join('x')]);
      (0, _chai.expect)(result.string).to.equal(`<span class="word-count" style="${errorStyle}">-5</span>`);
    });
    (0, _mocha.it)('counts multibyte correctly', function () {
      let result = (0, _ghCountCharacters.countCharacters)(['💩']);
      (0, _chai.expect)(result.string).to.equal(`<span class="word-count" style="${defaultStyle}">199</span>`); // emoji + modifier is still two chars

      result = (0, _ghCountCharacters.countCharacters)(['💃🏻']);
      (0, _chai.expect)(result.string).to.equal(`<span class="word-count" style="${defaultStyle}">198</span>`);
    });
  });
});
define("ghost-admin/tests/unit/helpers/gh-count-down-characters-test", ["ghost-admin/helpers/gh-count-down-characters", "mocha", "chai"], function (_ghCountDownCharacters, _mocha, _chai) {
  "use strict";

  (0, _mocha.describe)('Unit: Helper: gh-count-down-characters', function () {
    let validStyle = 'color: rgb(48, 207, 67);';
    let errorStyle = 'color: rgb(226, 84, 64);';
    (0, _mocha.it)('counts chars', function () {
      let result = (0, _ghCountDownCharacters.countDownCharacters)(['test', 200]);
      (0, _chai.expect)(result.string).to.equal(`<span class="word-count" style="${validStyle}">4</span>`);
    });
    (0, _mocha.it)('warns with too many chars', function () {
      let result = (0, _ghCountDownCharacters.countDownCharacters)([Array(205 + 1).join('x'), 200]);
      (0, _chai.expect)(result.string).to.equal(`<span class="word-count" style="${errorStyle}">205</span>`);
    });
    (0, _mocha.it)('counts multibyte correctly', function () {
      let result = (0, _ghCountDownCharacters.countDownCharacters)(['💩', 200]);
      (0, _chai.expect)(result.string).to.equal(`<span class="word-count" style="${validStyle}">1</span>`); // emoji + modifier is still two chars

      result = (0, _ghCountDownCharacters.countDownCharacters)(['💃🏻', 200]);
      (0, _chai.expect)(result.string).to.equal(`<span class="word-count" style="${validStyle}">2</span>`);
    });
  });
});
define("ghost-admin/tests/unit/helpers/gh-user-can-admin-test", ["mocha", "chai", "ghost-admin/helpers/gh-user-can-admin"], function (_mocha, _chai, _ghUserCanAdmin) {
  "use strict";

  (0, _mocha.describe)('Unit: Helper: gh-user-can-admin', function () {
    // Mock up roles and test for truthy
    (0, _mocha.describe)('Owner or admin roles', function () {
      let user = {
        get(role) {
          if (role === 'isAdmin') {
            return true;
          }

          throw new Error('unsupported'); // Make sure we only call get('isAdmin')
        }

      };
      (0, _mocha.it)(' - can be Admin', function () {
        let result = (0, _ghUserCanAdmin.ghUserCanAdmin)([user]);
        (0, _chai.expect)(result).to.equal(true);
      });
    });
    (0, _mocha.describe)('Editor, Author & Contributor roles', function () {
      let user = {
        get(role) {
          if (role === 'isAdmin') {
            return false;
          }

          throw new Error('unsupported'); // Make sure we only call get('isAdmin')
        }

      };
      (0, _mocha.it)(' - cannot be Admin', function () {
        let result = (0, _ghUserCanAdmin.ghUserCanAdmin)([user]);
        (0, _chai.expect)(result).to.equal(false);
      });
    });
  });
});
define("ghost-admin/tests/unit/helpers/highlighted-text-test", ["mocha", "chai", "ghost-admin/helpers/highlighted-text"], function (_mocha, _chai, _highlightedText) {
  "use strict";

  (0, _mocha.describe)('Unit: Helper: highlighted-text', function () {
    (0, _mocha.it)('works', function () {
      let result = (0, _highlightedText.highlightedText)(['Test', 'e']);
      (0, _chai.expect)(result).to.be.an('object');
      (0, _chai.expect)(result.string).to.equal('T<span class="highlight">e</span>st');
    });
  });
});
define("ghost-admin/tests/unit/helpers/most-recently-updated-test", ["moment", "mocha", "chai", "ghost-admin/helpers/most-recently-updated"], function (_moment, _mocha, _chai, _mostRecentlyUpdated) {
  "use strict";

  (0, _mocha.describe)('Unit: Helper: most-recently-updated', function () {
    (0, _mocha.it)('returns most recent - updatedAtUTC', function () {
      const a = {
        updatedAtUTC: _moment.default.utc('2022-03-04 16:10')
      };
      const b = {
        updatedAtUTC: _moment.default.utc('2022-03-03 16:10')
      };
      const c = {
        updatedAtUTC: _moment.default.utc('2022-03-04 16:20')
      };
      const subs = [a, b, c];
      (0, _chai.expect)((0, _mostRecentlyUpdated.mostRecentlyUpdated)(subs)).to.equal(c);
    });
    (0, _mocha.it)('returns most recent - updatedAt', function () {
      const a = {
        updatedAt: (0, _moment.default)('2022-03-04 16:10')
      };
      const b = {
        updatedAt: (0, _moment.default)('2022-03-05 16:10')
      };
      const c = {
        updatedAt: (0, _moment.default)('2022-03-04 16:20')
      };
      const subs = [a, b, c];
      (0, _chai.expect)((0, _mostRecentlyUpdated.mostRecentlyUpdated)(subs)).to.equal(b);
    });
    (0, _mocha.it)('returns most recent - updated_at', function () {
      const a = {
        updated_at: '2022-03-04 16:10'
      };
      const b = {
        updated_at: '2022-03-03 16:10'
      };
      const c = {
        updated_at: '2022-03-04 16:20'
      };
      const subs = [a, b, c];
      (0, _chai.expect)((0, _mostRecentlyUpdated.mostRecentlyUpdated)(subs)).to.equal(c);
    });
    (0, _mocha.it)('handles a single-element array', function () {
      const a = {
        updated_at: '2022-02-22'
      };
      (0, _chai.expect)((0, _mostRecentlyUpdated.mostRecentlyUpdated)([a])).to.equal(a);
    });
    (0, _mocha.it)('handles null', function () {
      (0, _chai.expect)((0, _mostRecentlyUpdated.mostRecentlyUpdated)(null)).to.equal(null);
    });
    (0, _mocha.it)('handles empty array', function () {
      (0, _chai.expect)((0, _mostRecentlyUpdated.mostRecentlyUpdated)([])).to.equal(null);
    });
    (0, _mocha.it)('does not modify original array', function () {
      const a = {
        updated_at: '2022-03-04 16:10'
      };
      const b = {
        updated_at: '2022-03-03 16:10'
      };
      const c = {
        updated_at: '2022-03-04 16:20'
      };
      const subs = [a, b, c];
      (0, _mostRecentlyUpdated.mostRecentlyUpdated)(subs);
      (0, _chai.expect)(subs[0]).to.equal(a);
      (0, _chai.expect)(subs[1]).to.equal(b);
      (0, _chai.expect)(subs[2]).to.equal(c);
    });
  });
});
define("ghost-admin/tests/unit/mixins/validation-engine-test", ["mocha"], function (_mocha) {
  "use strict";

  // import {expect} from 'chai';
  // import EmberObject from 'ember-object';
  // import ValidationEngineMixin from 'ghost-admin/mixins/validation-engine';
  (0, _mocha.describe)('ValidationEngineMixin', function () {
    (0, _mocha.describe)('#validate', function () {
      (0, _mocha.it)('loads the correct validator');
      (0, _mocha.it)('rejects if the validator doesn\'t exist');
      (0, _mocha.it)('resolves with valid object');
      (0, _mocha.it)('rejects with invalid object');
      (0, _mocha.it)('clears all existing errors');
      (0, _mocha.describe)('with a specified property', function () {
        (0, _mocha.it)('resolves with valid property');
        (0, _mocha.it)('rejects with invalid property');
        (0, _mocha.it)('adds property to hasValidated array');
        (0, _mocha.it)('clears existing error on specified property');
      });
      (0, _mocha.it)('handles a passed in model');
      (0, _mocha.it)('uses this.model if available');
    });
    (0, _mocha.describe)('#save', function () {
      (0, _mocha.it)('calls validate');
      (0, _mocha.it)('rejects with validation errors');
      (0, _mocha.it)('calls object\'s #save if validation passes');
      (0, _mocha.it)('skips validation if it\'s a deletion');
    });
  });
});
define("ghost-admin/tests/unit/models/invite-test", ["pretender", "ghost-admin/utils/ghost-paths", "mocha", "chai", "@ember/test-helpers", "ember-mocha"], function (_pretender, _ghostPaths, _mocha, _chai, _testHelpers, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit: Model: invite', function () {
    (0, _emberMocha.setupTest)();
    (0, _mocha.describe)('with network', function () {
      let server;
      beforeEach(function () {
        server = new _pretender.default();
      });
      afterEach(function () {
        server.shutdown();
      });
      (0, _mocha.it)('resend hits correct endpoints', async function () {
        let store = this.owner.lookup('service:store');
        let model = store.createRecord('invite', {
          id: 42
        });
        let role;
        server.delete(`${(0, _ghostPaths.default)().apiRoot}/invites/42`, function () {
          return [204, {}, '{}'];
        });
        server.post(`${(0, _ghostPaths.default)().apiRoot}/invites/`, function () {
          return [200, {}, '{}'];
        });
        Ember.run(() => {
          role = store.push({
            data: {
              id: 1,
              type: 'role',
              attributes: {
                name: 'Editor'
              }
            }
          });
          model.set('email', 'resend-test@example.com');
          model.set('role', role);
          model.resend();
        });
        await (0, _testHelpers.settled)();
        (0, _chai.expect)(server.handledRequests.length, 'number of requests').to.equal(2);
        let [, lastRequest] = server.handledRequests;
        let requestBody = JSON.parse(lastRequest.requestBody);
        let [invite] = requestBody.invites;
        (0, _chai.expect)(requestBody.invites.length, 'number of invites in request body').to.equal(1);
        (0, _chai.expect)(invite.email).to.equal('resend-test@example.com'); // eslint-disable-next-line camelcase

        (0, _chai.expect)(invite.role_id, 'role ID').to.equal('1');
      });
    });
  });
});
define("ghost-admin/tests/unit/models/member-test", ["mocha", "chai", "ember-mocha"], function (_mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit: Model: member', function () {
    (0, _emberMocha.setupTest)();
    let store;
    beforeEach(function () {
      store = this.owner.lookup('service:store');
    });
    (0, _mocha.it)('has a validation type of "member"', function () {
      let model = store.createRecord('member');
      (0, _chai.expect)(model.get('validationType')).to.equal('member');
    });
  });
});
define("ghost-admin/tests/unit/models/navigation-item-test", ["mocha", "chai", "ember-mocha"], function (_mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit: Model: navigation-item', function () {
    (0, _emberMocha.setupTest)();
    (0, _mocha.it)('isComplete is true when label and url are filled', function () {
      let model = this.owner.lookup('model:navigation-item');
      model.set('label', 'test');
      model.set('url', 'test');
      (0, _chai.expect)(model.get('isComplete')).to.be.true;
    });
    (0, _mocha.it)('isComplete is false when label is blank', function () {
      let model = this.owner.lookup('model:navigation-item');
      model.set('label', '');
      model.set('url', 'test');
      (0, _chai.expect)(model.get('isComplete')).to.be.false;
    });
    (0, _mocha.it)('isComplete is false when url is blank', function () {
      let model = this.owner.lookup('model:navigation-item');
      model.set('label', 'test');
      model.set('url', '');
      (0, _chai.expect)(model.get('isComplete')).to.be.false;
    });
    (0, _mocha.it)('isBlank is true when label and url are blank', function () {
      let model = this.owner.lookup('model:navigation-item');
      model.set('label', '');
      model.set('url', '');
      (0, _chai.expect)(model.get('isBlank')).to.be.true;
    });
    (0, _mocha.it)('isBlank is false when label is present', function () {
      let model = this.owner.lookup('model:navigation-item');
      model.set('label', 'test');
      model.set('url', '');
      (0, _chai.expect)(model.get('isBlank')).to.be.false;
    });
    (0, _mocha.it)('isBlank is false when url is present', function () {
      let model = this.owner.lookup('model:navigation-item');
      model.set('label', '');
      model.set('url', 'test');
      (0, _chai.expect)(model.get('isBlank')).to.be.false;
    });
  });
});
define("ghost-admin/tests/unit/models/post-test", ["mocha", "chai", "ember-mocha"], function (_mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit: Model: post', function () {
    (0, _emberMocha.setupTest)();
    let store;
    beforeEach(function () {
      store = this.owner.lookup('service:store');
    });
    (0, _mocha.it)('has a validation type of "post"', function () {
      let model = store.createRecord('post');
      (0, _chai.expect)(model.validationType).to.equal('post');
    });
    (0, _mocha.it)('isPublished, isDraft and isScheduled are correct', function () {
      let model = store.createRecord('post', {
        status: 'published'
      });
      (0, _chai.expect)(model.get('isPublished')).to.be.ok;
      (0, _chai.expect)(model.get('isDraft')).to.not.be.ok;
      (0, _chai.expect)(model.get('isScheduled')).to.not.be.ok;
      Ember.run(function () {
        model.set('status', 'draft');
        (0, _chai.expect)(model.get('isPublished')).to.not.be.ok;
        (0, _chai.expect)(model.get('isDraft')).to.be.ok;
        (0, _chai.expect)(model.get('isScheduled')).to.not.be.ok;
      });
      Ember.run(function () {
        model.set('status', 'scheduled');
        (0, _chai.expect)(model.get('isScheduled')).to.be.ok;
        (0, _chai.expect)(model.get('isPublished')).to.not.be.ok;
        (0, _chai.expect)(model.get('isDraft')).to.not.be.ok;
      });
    });
    (0, _mocha.it)('isAuthoredByUser is correct', function () {
      let user1 = store.createRecord('user', {
        id: 'abcd1234'
      });
      let user2 = store.createRecord('user', {
        id: 'wxyz9876'
      });
      let model = store.createRecord('post', {
        authors: [user1]
      });
      (0, _chai.expect)(model.isAuthoredByUser(user1)).to.be.ok;
      Ember.run(function () {
        model.set('authors', [user2]);
        (0, _chai.expect)(model.isAuthoredByUser(user1)).to.not.be.ok;
      });
    });
    (0, _mocha.it)('updateTags removes and deletes old tags', function () {
      let model = store.createRecord('post');
      Ember.run(this, function () {
        let modelTags = model.get('tags');
        let tag1 = store.createRecord('tag', {
          id: '1'
        });
        let tag2 = store.createRecord('tag', {
          id: '2'
        });
        let tag3 = store.createRecord('tag'); // During testing a record created without an explicit id will get
        // an id of 'fixture-n' instead of null

        tag3.set('id', null);
        modelTags.pushObject(tag1);
        modelTags.pushObject(tag2);
        modelTags.pushObject(tag3);
        (0, _chai.expect)(model.get('tags.length')).to.equal(3);
        model.updateTags();
        (0, _chai.expect)(model.get('tags.length')).to.equal(2);
        (0, _chai.expect)(model.get('tags.firstObject.id')).to.equal('1');
        (0, _chai.expect)(model.get('tags').objectAt(1).get('id')).to.equal('2');
        (0, _chai.expect)(tag1.get('isDeleted')).to.not.be.ok;
        (0, _chai.expect)(tag2.get('isDeleted')).to.not.be.ok;
        (0, _chai.expect)(tag3.get('isDeleted')).to.be.ok;
      });
    });
  });
});
define("ghost-admin/tests/unit/models/role-test", ["mocha", "chai", "ember-mocha"], function (_mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit: Model: role', function () {
    (0, _emberMocha.setupTest)();
    (0, _mocha.it)('provides a lowercase version of the name', function () {
      let model = this.owner.lookup('service:store').createRecord('role', {
        name: 'Author'
      });
      (0, _chai.expect)(model.get('name')).to.equal('Author');
      (0, _chai.expect)(model.get('lowerCaseName')).to.equal('author');
      Ember.run(function () {
        model.set('name', 'Editor');
        (0, _chai.expect)(model.get('name')).to.equal('Editor');
        (0, _chai.expect)(model.get('lowerCaseName')).to.equal('editor');
      });
    });
  });
});
define("ghost-admin/tests/unit/models/setting-test", ["mocha", "chai", "ember-mocha"], function (_mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit: Model: setting', function () {
    (0, _emberMocha.setupTest)();
    (0, _mocha.it)('has a validation type of "setting"', function () {
      let model = this.owner.lookup('service:store').createRecord('setting');
      (0, _chai.expect)(model.get('validationType')).to.equal('setting');
    });
  });
});
define("ghost-admin/tests/unit/models/tag-test", ["mocha", "chai", "ember-mocha"], function (_mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit: Model: tag', function () {
    (0, _emberMocha.setupTest)();
    (0, _mocha.it)('has a validation type of "tag"', function () {
      let model = this.owner.lookup('service:store').createRecord('tag');
      (0, _chai.expect)(model.get('validationType')).to.equal('tag');
    });
  });
});
define("ghost-admin/tests/unit/models/user-test", ["mocha", "chai", "ember-mocha"], function (_mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit: Model: user', function () {
    (0, _emberMocha.setupTest)();
    let store;
    beforeEach(function () {
      store = this.owner.lookup('service:store');
    });
    (0, _mocha.it)('has a validation type of "user"', function () {
      let model = store.createRecord('user');
      (0, _chai.expect)(model.get('validationType')).to.equal('user');
    });
    (0, _mocha.it)('isActive/isSuspended properties are correct', function () {
      let model = store.createRecord('user', {
        status: 'active'
      });
      (0, _chai.expect)(model.get('isActive')).to.be.ok;
      (0, _chai.expect)(model.get('isSuspended')).to.not.be.ok;
      ['warn-1', 'warn-2', 'warn-3', 'warn-4', 'locked'].forEach(function (status) {
        Ember.run(() => {
          model.set('status', status);
        });
        (0, _chai.expect)(model.get('isActive')).to.be.ok;
        (0, _chai.expect)(model.get('isSuspended')).to.not.be.ok;
      });
      Ember.run(() => {
        model.set('status', 'inactive');
      });
      (0, _chai.expect)(model.get('isSuspended')).to.be.ok;
      (0, _chai.expect)(model.get('isActive')).to.not.be.ok;
    });
    (0, _mocha.it)('role property is correct', function () {
      let model = store.createRecord('user');
      Ember.run(() => {
        let role = store.push({
          data: {
            id: 1,
            type: 'role',
            attributes: {
              name: 'Author'
            }
          }
        });
        model.get('roles').pushObject(role);
      });
      (0, _chai.expect)(model.get('role.name')).to.equal('Author');
      Ember.run(() => {
        let role = store.push({
          data: {
            id: 1,
            type: 'role',
            attributes: {
              name: 'Editor'
            }
          }
        });
        model.set('role', role);
      });
      (0, _chai.expect)(model.get('role.name')).to.equal('Editor');
    });
    (0, _mocha.it)('isContributor property is correct', function () {
      let model = store.createRecord('user');
      Ember.run(() => {
        let role = store.push({
          data: {
            id: 1,
            type: 'role',
            attributes: {
              name: 'Contributor'
            }
          }
        });
        model.set('role', role);
      });
      (0, _chai.expect)(model.get('isContributor')).to.be.ok;
      (0, _chai.expect)(model.get('isAuthorOrContributor')).to.be.ok;
      (0, _chai.expect)(model.get('isAuthor')).to.not.be.ok;
      (0, _chai.expect)(model.get('isEditor')).to.not.be.ok;
      (0, _chai.expect)(model.get('isAdminOnly')).to.not.be.ok;
      (0, _chai.expect)(model.get('isOwnerOnly')).to.not.be.ok;
    });
    (0, _mocha.it)('isAuthor property is correct', function () {
      let model = store.createRecord('user');
      Ember.run(() => {
        let role = store.push({
          data: {
            id: 1,
            type: 'role',
            attributes: {
              name: 'Author'
            }
          }
        });
        model.set('role', role);
      });
      (0, _chai.expect)(model.get('isAuthor')).to.be.ok;
      (0, _chai.expect)(model.get('isContributor')).to.not.be.ok;
      (0, _chai.expect)(model.get('isAuthorOrContributor')).to.be.ok;
      (0, _chai.expect)(model.get('isEditor')).to.not.be.ok;
      (0, _chai.expect)(model.get('isAdminOnly')).to.not.be.ok;
      (0, _chai.expect)(model.get('isOwnerOnly')).to.not.be.ok;
    });
    (0, _mocha.it)('isEditor property is correct', function () {
      let model = store.createRecord('user');
      Ember.run(() => {
        let role = store.push({
          data: {
            id: 1,
            type: 'role',
            attributes: {
              name: 'Editor'
            }
          }
        });
        model.set('role', role);
      });
      (0, _chai.expect)(model.get('isEditor')).to.be.ok;
      (0, _chai.expect)(model.get('isAuthor')).to.not.be.ok;
      (0, _chai.expect)(model.get('isContributor')).to.not.be.ok;
      (0, _chai.expect)(model.get('isAuthorOrContributor')).to.not.be.ok;
      (0, _chai.expect)(model.get('isAdminOnly')).to.not.be.ok;
      (0, _chai.expect)(model.get('isOwnerOnly')).to.not.be.ok;
    });
    (0, _mocha.it)('isAdminOnly property is correct', function () {
      let model = store.createRecord('user');
      Ember.run(() => {
        let role = store.push({
          data: {
            id: 1,
            type: 'role',
            attributes: {
              name: 'Administrator'
            }
          }
        });
        model.set('role', role);
      });
      (0, _chai.expect)(model.get('isAdminOnly')).to.be.ok;
      (0, _chai.expect)(model.get('isAuthor')).to.not.be.ok;
      (0, _chai.expect)(model.get('isContributor')).to.not.be.ok;
      (0, _chai.expect)(model.get('isAuthorOrContributor')).to.not.be.ok;
      (0, _chai.expect)(model.get('isEditor')).to.not.be.ok;
      (0, _chai.expect)(model.get('isOwnerOnly')).to.not.be.ok;
    });
    (0, _mocha.it)('isOwnerOnly property is correct', function () {
      let model = store.createRecord('user');
      Ember.run(() => {
        let role = store.push({
          data: {
            id: 1,
            type: 'role',
            attributes: {
              name: 'Owner'
            }
          }
        });
        model.set('role', role);
      });
      (0, _chai.expect)(model.get('isOwnerOnly')).to.be.ok;
      (0, _chai.expect)(model.get('isAuthor')).to.not.be.ok;
      (0, _chai.expect)(model.get('isContributor')).to.not.be.ok;
      (0, _chai.expect)(model.get('isAuthorOrContributor')).to.not.be.ok;
      (0, _chai.expect)(model.get('isAdminOnly')).to.not.be.ok;
      (0, _chai.expect)(model.get('isEditor')).to.not.be.ok;
    });
  });
});
define("ghost-admin/tests/unit/serializers/notification-test", ["pretender", "ghost-admin/utils/ghost-paths", "mocha", "chai", "ember-mocha"], function (_pretender, _ghostPaths, _mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit: Serializer: notification', function () {
    (0, _emberMocha.setupTest)();
    let server;
    beforeEach(function () {
      server = new _pretender.default();
    });
    afterEach(function () {
      server.shutdown();
    });
    (0, _mocha.it)('converts location->key when deserializing', function () {
      server.get(`${(0, _ghostPaths.default)().apiRoot}/notifications`, function () {
        let response = {
          notifications: [{
            id: 1,
            dismissible: false,
            status: 'alert',
            type: 'info',
            location: 'test.foo',
            message: 'This is a test'
          }]
        };
        return [200, {
          'Content-Type': 'application/json'
        }, JSON.stringify(response)];
      });
      let store = this.owner.lookup('service:store');
      return store.findAll('notification').then(notifications => {
        (0, _chai.expect)(notifications.get('length')).to.equal(1);
        (0, _chai.expect)(notifications.get('firstObject.key')).to.equal('test.foo');
      });
    });
  });
});
define("ghost-admin/tests/unit/services/event-bus-test", ["sinon", "mocha", "chai", "ember-mocha"], function (_sinon, _mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit: Service: event-bus', function () {
    (0, _emberMocha.setupTest)();
    (0, _mocha.it)('works', function () {
      let service = this.owner.lookup('service:event-bus');

      let eventHandler = _sinon.default.spy();

      service.subscribe('test-event', this, eventHandler);
      service.publish('test-event', 'test');
      service.unsubscribe('test-event', this, eventHandler);
      service.publish('test-event', 'test two');
      (0, _chai.expect)(eventHandler.calledOnce, 'event handler only triggered once').to.be.true;
      (0, _chai.expect)(eventHandler.calledWith('test'), 'event handler was passed correct arguments').to.be.true;
    });
  });
});
define("ghost-admin/tests/unit/services/limit-test", ["mocha", "chai", "ember-mocha"], function (_mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit | Service | limit', function () {
    (0, _emberMocha.setupTest)();
    let limitService;
    beforeEach(function () {
      limitService = this.owner.lookup('service:limit');
    });
    (0, _mocha.it)('exists', function () {
      (0, _chai.expect)(limitService).to.be.ok;
    });
  });
});
define("ghost-admin/tests/unit/services/member-stats-test", ["moment", "mocha", "chai", "ember-mocha"], function (_moment, _mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit: Service: membersStats', function () {
    (0, _emberMocha.setupTest)();
    let memberStatsService;
    beforeEach(function () {
      memberStatsService = this.owner.lookup('service:membersStats');
    });
    (0, _mocha.it)('fills correct date and value for mrr data when no data points', function () {
      const data = [];
      const output = memberStatsService.fillDates(data);
      const values = Object.values(output);
      const keys = Object.keys(output);
      (0, _chai.expect)(values[0]).to.equal(0);
      (0, _chai.expect)(keys[0]).to.equal((0, _moment.default)().subtract(30, 'days').format('YYYY-MM-DD'));
      (0, _chai.expect)(keys[keys.length - 1]).to.equal((0, _moment.default)().format('YYYY-MM-DD'));
      (0, _chai.expect)(values[values.length - 1]).to.equal(0);
    });
    (0, _mocha.it)('fills correct date and value for mrr data when no data point in range', function () {
      const data = [{
        date: (0, _moment.default)().subtract(40, 'days').format('YYYY-MM-DD'),
        value: 10459
      }, {
        date: (0, _moment.default)().subtract(31, 'days').format('YYYY-MM-DD'),
        value: 14459
      }];
      const output = memberStatsService.fillDates(data);
      const values = Object.values(output);
      const keys = Object.keys(output);
      (0, _chai.expect)(values[0]).to.equal(14459);
      (0, _chai.expect)(keys[0]).to.equal((0, _moment.default)().subtract(30, 'days').format('YYYY-MM-DD'));
      (0, _chai.expect)(keys[keys.length - 1]).to.equal((0, _moment.default)().format('YYYY-MM-DD'));
      (0, _chai.expect)(values[values.length - 1]).to.equal(14459);
    });
    (0, _mocha.it)('fills correct date and value for mrr data when first data point outside range', function () {
      const data = [{
        date: (0, _moment.default)().subtract(31, 'days').format('YYYY-MM-DD'),
        value: 14459
      }, {
        date: (0, _moment.default)().subtract(10, 'days').format('YYYY-MM-DD'),
        value: 98176
      }];
      const output = memberStatsService.fillDates(data);
      const values = Object.values(output);
      const keys = Object.keys(output);
      (0, _chai.expect)(values[0]).to.equal(14459);
      (0, _chai.expect)(keys[0]).to.equal((0, _moment.default)().subtract(30, 'days').format('YYYY-MM-DD'));
      (0, _chai.expect)(keys[keys.length - 1]).to.equal((0, _moment.default)().format('YYYY-MM-DD'));
      (0, _chai.expect)(values[values.length - 1]).to.equal(98176);
    });
    (0, _mocha.it)('fills correct date and value for mrr data when only 1 data point in range', function () {
      const data = [{
        date: (0, _moment.default)().subtract(29, 'days').format('YYYY-MM-DD'),
        value: 14459
      }];
      const output = memberStatsService.fillDates(data);
      const values = Object.values(output);
      const keys = Object.keys(output);
      (0, _chai.expect)(values[0]).to.equal(14459);
      (0, _chai.expect)(keys[0]).to.equal((0, _moment.default)().subtract(30, 'days').format('YYYY-MM-DD'));
      (0, _chai.expect)(keys[keys.length - 1]).to.equal((0, _moment.default)().format('YYYY-MM-DD'));
      (0, _chai.expect)(values[values.length - 1]).to.equal(14459);
    });
  });
});
define("ghost-admin/tests/unit/services/notifications-test", ["sinon", "ember-ajax/errors", "ghost-admin/services/ajax", "mocha", "chai", "ember-mocha", "ghost-admin/services/notifications"], function (_sinon, _errors, _ajax, _mocha, _chai, _emberMocha, _notifications) {
  "use strict";

  // notifications service determines if a notification is a model instance by
  // checking `notification.constructor.modelName === 'notification'`
  const NotificationStub = Ember.Object.extend();
  NotificationStub.modelName = 'notification';
  (0, _mocha.describe)('Unit: Service: notifications', function () {
    (0, _emberMocha.setupTest)();
    beforeEach(function () {
      this.owner.lookup('service:notifications').set('content', Ember.A());
      this.owner.lookup('service:notifications').set('delayedNotifications', Ember.A());
    });
    (0, _mocha.it)('filters alerts/notifications', function () {
      let notifications = this.owner.lookup('service:notifications'); // wrapped in run-loop to enure alerts/notifications CPs are updated

      Ember.run(() => {
        notifications.showAlert('Alert');
        notifications.showNotification('Notification');
      });
      (0, _chai.expect)(notifications.alerts.length).to.equal(1);
      (0, _chai.expect)(notifications.alerts.firstObject.message).to.equal('Alert');
      (0, _chai.expect)(notifications.notifications.length).to.equal(1);
      (0, _chai.expect)(notifications.notifications.firstObject.message).to.equal('Notification');
    });
    (0, _mocha.it)('#handleNotification deals with DS.Notification notifications', function () {
      let notifications = this.owner.lookup('service:notifications');
      let notification = NotificationStub.create({
        message: '<h1>Test</h1>',
        status: 'alert'
      });
      notifications.handleNotification(notification);
      notification = notifications.alerts[0]; // alerts received from the server should be marked html safe

      (0, _chai.expect)(notification.message).to.have.property('toHTML');
    });
    (0, _mocha.it)('#handleNotification defaults to notification if no status supplied', function () {
      let notifications = this.owner.lookup('service:notifications');
      notifications.handleNotification({
        message: 'Test'
      }, false);
      (0, _chai.expect)(notifications.content).to.deep.include({
        message: 'Test',
        status: 'notification'
      });
    });
    (0, _mocha.it)('#handleNotification shows generic error message when a word matches built-in error type', function () {
      let notifications = this.owner.lookup('service:notifications');
      notifications.handleNotification({
        message: 'TypeError test'
      });
      (0, _chai.expect)(notifications.content[0].message).to.equal(_notifications.GENERIC_ERROR_MESSAGE);
      notifications.clearAll();
      (0, _chai.expect)(notifications.content.length).to.equal(0);
      notifications.handleNotification({
        message: 'TypeError: Testing'
      });
      (0, _chai.expect)(notifications.content[0].message).to.equal(_notifications.GENERIC_ERROR_MESSAGE);
      notifications.clearAll();
      notifications.handleNotification({
        message: 'Unknown error - TypeError, cannot save invite.'
      });
      (0, _chai.expect)(notifications.content[0].message).to.equal(_notifications.GENERIC_ERROR_MESSAGE);
    });
    (0, _mocha.it)('#showAlert adds POJO alerts', function () {
      let notifications = this.owner.lookup('service:notifications');
      Ember.run(() => {
        notifications.showAlert('Test Alert', {
          type: 'error'
        });
      });
      (0, _chai.expect)(notifications.alerts).to.deep.include({
        message: 'Test Alert',
        status: 'alert',
        type: 'error',
        key: undefined,
        actions: undefined,
        description: undefined,
        icon: undefined
      });
    });
    (0, _mocha.it)('#showAlert adds delayed notifications', function () {
      let notifications = this.owner.lookup('service:notifications');
      Ember.run(() => {
        notifications.showNotification('Test Alert', {
          type: 'error',
          delayed: true
        });
      });
      (0, _chai.expect)(notifications.delayedNotifications).to.deep.include({
        message: 'Test Alert',
        status: 'notification',
        type: 'error',
        key: undefined,
        actions: undefined,
        description: undefined,
        icon: undefined
      });
    }); // in order to cater for complex keys that are suitable for i18n
    // we split on the second period and treat the resulting base as
    // the key for duplicate checking

    (0, _mocha.it)('#showAlert clears duplicates using keys', function () {
      let notifications = this.owner.lookup('service:notifications');
      Ember.run(() => {
        notifications.showAlert('Kept');
        notifications.showAlert('Duplicate', {
          key: 'duplicate.key.fail'
        });
      });
      (0, _chai.expect)(notifications.alerts.length).to.equal(2);
      Ember.run(() => {
        notifications.showAlert('Duplicate with new message', {
          key: 'duplicate.key.success'
        });
      });
      (0, _chai.expect)(notifications.alerts.length).to.equal(2);
      (0, _chai.expect)(notifications.alerts.lastObject.message).to.equal('Duplicate with new message');
    });
    (0, _mocha.it)('#showAlert clears duplicates using message text', function () {
      let notifications = this.owner.lookup('service:notifications');
      notifications.showAlert('Not duplicate');
      notifications.showAlert('Duplicate', {
        key: 'duplicate'
      });
      notifications.showAlert('Duplicate');
      (0, _chai.expect)(notifications.alerts.length).to.equal(2);
      (0, _chai.expect)(notifications.alerts.lastObject.key).to.not.exist;
    });
    (0, _mocha.it)('#showNotification adds POJO notifications', function () {
      let notifications = this.owner.lookup('service:notifications');
      Ember.run(() => {
        notifications.showNotification('Test Notification', {
          type: 'success'
        });
      });
      (0, _chai.expect)(notifications.notifications).to.deep.include({
        message: 'Test Notification',
        status: 'notification',
        type: 'success',
        key: undefined,
        actions: undefined,
        description: undefined,
        icon: undefined
      });
    });
    (0, _mocha.it)('#showNotification adds delayed notifications', function () {
      let notifications = this.owner.lookup('service:notifications');
      Ember.run(() => {
        notifications.showNotification('Test Notification', {
          delayed: true
        });
      });
      (0, _chai.expect)(notifications.delayedNotifications).to.deep.include({
        message: 'Test Notification',
        status: 'notification',
        type: undefined,
        key: undefined,
        actions: undefined,
        description: undefined,
        icon: undefined
      });
    });
    (0, _mocha.it)('#showAPIError handles single json response error', function () {
      let notifications = this.owner.lookup('service:notifications');
      let error = new _errors.AjaxError({
        errors: [{
          message: 'Single error'
        }]
      });
      Ember.run(() => {
        notifications.showAPIError(error);
      });
      let [alert] = notifications.alerts;
      (0, _chai.expect)(alert.message).to.equal('Single error');
      (0, _chai.expect)(alert.status).to.equal('alert');
      (0, _chai.expect)(alert.type).to.equal('error');
      (0, _chai.expect)(alert.key).to.equal('api-error');
    });
    (0, _mocha.it)('#showAPIError handles multiple json response errors', function () {
      let notifications = this.owner.lookup('service:notifications');
      let error = new _errors.AjaxError({
        errors: [{
          title: 'First error',
          message: 'First error message'
        }, {
          title: 'Second error',
          message: 'Second error message'
        }]
      });
      Ember.run(() => {
        notifications.showAPIError(error);
      });
      (0, _chai.expect)(notifications.alerts.length).to.equal(2);
      let [alert1, alert2] = notifications.alerts;
      (0, _chai.expect)(alert1).to.deep.equal({
        message: 'First error message',
        status: 'alert',
        type: 'error',
        key: 'api-error.first-error',
        actions: undefined,
        description: undefined,
        icon: undefined
      });
      (0, _chai.expect)(alert2).to.deep.equal({
        message: 'Second error message',
        status: 'alert',
        type: 'error',
        key: 'api-error.second-error',
        actions: undefined,
        description: undefined,
        icon: undefined
      });
    });
    (0, _mocha.it)('#showAPIError displays default error text if response has no error/message', function () {
      let notifications = this.owner.lookup('service:notifications');
      let resp = false;
      Ember.run(() => {
        notifications.showAPIError(resp);
      });
      (0, _chai.expect)(notifications.content).to.deep.equal([{
        message: 'There was a problem on the server, please try again.',
        status: 'alert',
        type: 'error',
        key: 'api-error',
        actions: undefined,
        description: undefined,
        icon: undefined
      }]);
      notifications.set('content', Ember.A());
      Ember.run(() => {
        notifications.showAPIError(resp, {
          defaultErrorText: 'Overridden default'
        });
      });
      (0, _chai.expect)(notifications.content).to.deep.equal([{
        message: 'Overridden default',
        status: 'alert',
        type: 'error',
        key: 'api-error',
        actions: undefined,
        description: undefined,
        icon: undefined
      }]);
    });
    (0, _mocha.it)('#showAPIError sets correct key when passed a base key', function () {
      let notifications = this.owner.lookup('service:notifications');
      Ember.run(() => {
        notifications.showAPIError('Test', {
          key: 'test.alert'
        });
      });
      (0, _chai.expect)(notifications.alerts.firstObject.key).to.equal('api-error.test.alert');
    });
    (0, _mocha.it)('#showAPIError sets correct key when not passed a key', function () {
      let notifications = this.owner.lookup('service:notifications');
      Ember.run(() => {
        notifications.showAPIError('Test');
      });
      (0, _chai.expect)(notifications.alerts.firstObject.key).to.equal('api-error');
    });
    (0, _mocha.it)('#showAPIError parses default ember-ajax errors correctly', function () {
      let notifications = this.owner.lookup('service:notifications');
      let error = new _errors.InvalidError();
      Ember.run(() => {
        notifications.showAPIError(error);
      });
      let notification = notifications.alerts.firstObject;
      (0, _chai.expect)(notification.message).to.equal('Request was rejected because it was invalid');
      (0, _chai.expect)(notification.status).to.equal('alert');
      (0, _chai.expect)(notification.type).to.equal('error');
      (0, _chai.expect)(notification.key).to.equal('api-error');
    });
    (0, _mocha.it)('#showAPIError parses custom ember-ajax errors correctly', function () {
      let notifications = this.owner.lookup('service:notifications');
      let error = new _ajax.ServerUnreachableError();
      Ember.run(() => {
        notifications.showAPIError(error);
      });
      let notification = notifications.alerts.firstObject;
      (0, _chai.expect)(notification.message).to.equal('Server was unreachable');
      (0, _chai.expect)(notification.status).to.equal('alert');
      (0, _chai.expect)(notification.type).to.equal('error');
      (0, _chai.expect)(notification.key).to.equal('api-error');
    });
    (0, _mocha.it)('#showAPIError adds error context to message if available', function () {
      let notifications = this.owner.lookup('service:notifications');
      let error = new _errors.AjaxError({
        errors: [{
          message: 'Authorization Error.',
          context: 'Please sign in.'
        }]
      });
      Ember.run(() => {
        notifications.showAPIError(error);
      });
      let [alert] = notifications.alerts;
      (0, _chai.expect)(alert.message).to.equal('Authorization Error. Please sign in.');
      (0, _chai.expect)(alert.status).to.equal('alert');
      (0, _chai.expect)(alert.type).to.equal('error');
      (0, _chai.expect)(alert.key).to.equal('api-error');
    });
    (0, _mocha.it)('#showAPIError shows generic error for built-in error types', function () {
      let notifications = this.owner.lookup('service:notifications');
      const error = new TypeError('Testing');
      notifications.showAPIError(error);
      (0, _chai.expect)(notifications.alerts[0].message).to.equal(_notifications.GENERIC_ERROR_MESSAGE);
    });
    (0, _mocha.it)('#displayDelayed moves delayed notifications into content', function () {
      let notifications = this.owner.lookup('service:notifications');
      Ember.run(() => {
        notifications.showNotification('First', {
          delayed: true
        });
        notifications.showNotification('Second', {
          delayed: true
        });
        notifications.showNotification('Third', {
          delayed: false
        });
        notifications.displayDelayed();
      });
      (0, _chai.expect)(notifications.notifications).to.deep.equal([{
        message: 'Third',
        status: 'notification',
        type: undefined,
        key: undefined,
        actions: undefined,
        description: undefined,
        icon: undefined
      }, {
        message: 'First',
        status: 'notification',
        type: undefined,
        key: undefined,
        actions: undefined,
        description: undefined,
        icon: undefined
      }, {
        message: 'Second',
        status: 'notification',
        type: undefined,
        key: undefined,
        actions: undefined,
        description: undefined,
        icon: undefined
      }]);
    });
    (0, _mocha.it)('#closeNotification removes POJO notifications', function () {
      let notification = {
        message: 'Close test',
        status: 'notification'
      };
      let notifications = this.owner.lookup('service:notifications');
      Ember.run(() => {
        notifications.handleNotification(notification);
      });
      (0, _chai.expect)(notifications.notifications).to.include(notification);
      Ember.run(() => {
        notifications.closeNotification(notification);
      });
      (0, _chai.expect)(notifications.notifications).to.not.include(notification);
    });
    (0, _mocha.it)('#closeNotification removes and deletes DS.Notification records', function () {
      let notifications = this.owner.lookup('service:notifications');
      let notification = NotificationStub.create({
        message: 'Close test',
        status: 'alert'
      });

      notification.deleteRecord = function () {};

      _sinon.default.spy(notification, 'deleteRecord');

      notification.save = function () {
        return {
          finally(callback) {
            return callback(notification);
          }

        };
      };

      _sinon.default.spy(notification, 'save');

      Ember.run(() => {
        notifications.handleNotification(notification);
      });
      (0, _chai.expect)(notifications.alerts).to.include(notification);
      Ember.run(() => {
        notifications.closeNotification(notification);
      });
      (0, _chai.expect)(notification.deleteRecord.calledOnce).to.be.true;
      (0, _chai.expect)(notification.save.calledOnce).to.be.true;
      (0, _chai.expect)(notifications.alerts).to.not.include(notification);
    });
    (0, _mocha.it)('#closeNotifications only removes notifications', function () {
      let notifications = this.owner.lookup('service:notifications');
      Ember.run(() => {
        notifications.showAlert('First alert');
        notifications.showNotification('First notification');
        notifications.showNotification('Second notification');
      });
      (0, _chai.expect)(notifications.alerts.length, 'alerts count').to.equal(1);
      (0, _chai.expect)(notifications.notifications.length, 'notifications count').to.equal(2);
      Ember.run(() => {
        notifications.closeNotifications();
      });
      (0, _chai.expect)(notifications.alerts.length, 'alerts count').to.equal(1);
      (0, _chai.expect)(notifications.notifications.length, 'notifications count').to.equal(0);
    });
    (0, _mocha.it)('#closeNotifications only closes notifications with specified key', function () {
      let notifications = this.owner.lookup('service:notifications');
      Ember.run(() => {
        notifications.showAlert('First alert'); // using handleNotification as showNotification will auto-prune duplicates

        notifications.handleNotification({
          message: 'First notification',
          key: 'test.close',
          status: 'notification'
        });
        notifications.handleNotification({
          message: 'Second notification',
          key: 'test.keep',
          status: 'notification'
        });
        notifications.handleNotification({
          message: 'Third notification',
          key: 'test.close',
          status: 'notification'
        });
      });
      Ember.run(() => {
        notifications.closeNotifications('test.close');
      });
      (0, _chai.expect)(notifications.notifications.length, 'notifications count').to.equal(1);
      (0, _chai.expect)(notifications.notifications.firstObject.message, 'notification message').to.equal('Second notification');
      (0, _chai.expect)(notifications.alerts.length, 'alerts count').to.equal(1);
    });
    (0, _mocha.it)('#clearAll removes everything without deletion', function () {
      let notifications = this.owner.lookup('service:notifications');
      let notificationModel = Ember.Object.create({
        message: 'model'
      });

      notificationModel.deleteRecord = function () {};

      _sinon.default.spy(notificationModel, 'deleteRecord');

      notificationModel.save = function () {
        return {
          finally(callback) {
            return callback(notificationModel);
          }

        };
      };

      _sinon.default.spy(notificationModel, 'save');

      notifications.handleNotification(notificationModel);
      notifications.handleNotification({
        message: 'pojo'
      });
      notifications.clearAll();
      (0, _chai.expect)(notifications.content).to.be.empty;
      (0, _chai.expect)(notificationModel.deleteRecord.called).to.be.false;
      (0, _chai.expect)(notificationModel.save.called).to.be.false;
    });
    (0, _mocha.it)('#closeAlerts only removes alerts', function () {
      let notifications = this.owner.lookup('service:notifications');
      notifications.showNotification('First notification');
      notifications.showAlert('First alert');
      notifications.showAlert('Second alert');
      Ember.run(() => {
        notifications.closeAlerts();
      });
      (0, _chai.expect)(notifications.alerts.length).to.equal(0);
      (0, _chai.expect)(notifications.notifications.length).to.equal(1);
    });
    (0, _mocha.it)('#closeAlerts closes only alerts with specified key', function () {
      let notifications = this.owner.lookup('service:notifications');
      notifications.showNotification('First notification');
      notifications.showAlert('First alert', {
        key: 'test.close'
      });
      notifications.showAlert('Second alert', {
        key: 'test.keep'
      });
      notifications.showAlert('Third alert', {
        key: 'test.close'
      });
      Ember.run(() => {
        notifications.closeAlerts('test.close');
      });
      (0, _chai.expect)(notifications.alerts.length).to.equal(1);
      (0, _chai.expect)(notifications.alerts.firstObject.message).to.equal('Second alert');
      (0, _chai.expect)(notifications.notifications.length).to.equal(1);
    });
  });
});
define("ghost-admin/tests/unit/services/unsplash-test", ["pretender", "mocha", "chai", "@ember/test-helpers", "ember-mocha"], function (_pretender, _mocha, _chai, _testHelpers, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit: Service: unsplash', function () {
    (0, _emberMocha.setupTest)();
    let server;
    beforeEach(function () {
      server = new _pretender.default();
    });
    afterEach(function () {
      server.shutdown();
    });
    (0, _mocha.it)('can load new');
    (0, _mocha.it)('can load next page');
    (0, _mocha.describe)('search', function () {
      (0, _mocha.it)('sends search request');
      (0, _mocha.it)('debounces query updates');
      (0, _mocha.it)('can load next page of search results');
      (0, _mocha.it)('clears photos when starting new search');
      (0, _mocha.it)('loads new when query is cleared');
    });
    (0, _mocha.describe)('columns', function () {
      (0, _mocha.it)('sorts photos into columns based on column height');
      (0, _mocha.it)('can change column count');
    });
    (0, _mocha.describe)('error handling', function () {
      (0, _mocha.it)('handles rate limit exceeded', async function () {
        server.get('https://api.unsplash.com/photos', function () {
          return [403, {
            'x-ratelimit-remaining': '0'
          }, 'Rate Limit Exceeded'];
        });
        let service = this.owner.lookup('service:unsplash');
        Ember.run(() => {
          service.loadNextPage();
        });
        await (0, _testHelpers.settled)();
        (0, _chai.expect)(service.get('error')).to.have.string('Unsplash API rate limit reached');
      });
      (0, _mocha.it)('handles json errors', async function () {
        server.get('https://api.unsplash.com/photos', function () {
          return [500, {
            'Content-Type': 'application/json'
          }, JSON.stringify({
            errors: ['Unsplash API Error']
          })];
        });
        let service = this.owner.lookup('service:unsplash');
        Ember.run(() => {
          service.loadNextPage();
        });
        await (0, _testHelpers.settled)();
        (0, _chai.expect)(service.get('error')).to.equal('Unsplash API Error');
      });
      (0, _mocha.it)('handles text errors', async function () {
        server.get('https://api.unsplash.com/photos', function () {
          return [500, {
            'Content-Type': 'text/xml'
          }, 'Unsplash text error'];
        });
        let service = this.owner.lookup('service:unsplash');
        Ember.run(() => {
          service.loadNextPage();
        });
        await (0, _testHelpers.settled)();
        (0, _chai.expect)(service.get('error')).to.equal('Unsplash text error');
      });
    });
    (0, _mocha.describe)('isLoading', function () {
      (0, _mocha.it)('is false by default');
      (0, _mocha.it)('is true when loading new');
      (0, _mocha.it)('is true when loading next page');
      (0, _mocha.it)('is true when searching');
      (0, _mocha.it)('returns to false when finished');
    });
  });
});
define("ghost-admin/tests/unit/transforms/facebook-url-user-test", ["mocha", "chai", "ember-mocha"], function (_mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit: Transform: facebook-url-user', function () {
    (0, _emberMocha.setupTest)();
    (0, _mocha.it)('deserializes facebook url', function () {
      let transform = this.owner.lookup('transform:facebook-url-user');
      let serialized = 'testuser';
      let result = transform.deserialize(serialized);
      (0, _chai.expect)(result).to.equal('https://www.facebook.com/testuser');
    });
    (0, _mocha.it)('serializes url to facebook username', function () {
      let transform = this.owner.lookup('transform:facebook-url-user');
      let deserialized = 'https://www.facebook.com/testuser';
      let result = transform.serialize(deserialized);
      (0, _chai.expect)(result).to.equal('testuser');
    });
  });
});
define("ghost-admin/tests/unit/transforms/json-string-test", ["mocha", "chai", "ember-mocha"], function (_mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit: Transform: json-string', function () {
    (0, _emberMocha.setupTest)();
    (0, _mocha.it)('serialises an Object to a JSON String', function () {
      let transform = this.owner.lookup('transform:json-string');
      let obj = {
        one: 'one',
        two: 'two'
      };
      (0, _chai.expect)(transform.serialize(obj)).to.equal(JSON.stringify(obj));
    });
    (0, _mocha.it)('deserialises a JSON String to an Object', function () {
      let transform = this.owner.lookup('transform:json-string');
      let obj = {
        one: 'one',
        two: 'two'
      };
      (0, _chai.expect)(transform.deserialize(JSON.stringify(obj))).to.deep.equal(obj);
    });
    (0, _mocha.it)('handles deserializing a blank string', function () {
      let transform = this.owner.lookup('transform:json-string');
      (0, _chai.expect)(transform.deserialize('')).to.equal(null);
    });
  });
});
define("ghost-admin/tests/unit/transforms/navigation-settings-test", ["ghost-admin/models/navigation-item", "mocha", "chai", "ember-mocha"], function (_navigationItem, _mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit: Transform: navigation-settings', function () {
    (0, _emberMocha.setupTest)();
    (0, _mocha.it)('deserializes navigation json', function () {
      let transform = this.owner.lookup('transform:navigation-settings');
      let serialized = '[{"label":"One","url":"/one"},{"label":"Two","url":"/two"}]';
      let result = transform.deserialize(serialized);
      (0, _chai.expect)(result.length).to.equal(2);
      (0, _chai.expect)(result[0]).to.be.instanceof(_navigationItem.default);
      (0, _chai.expect)(result[0].get('label')).to.equal('One');
      (0, _chai.expect)(result[0].get('url')).to.equal('/one');
      (0, _chai.expect)(result[1]).to.be.instanceof(_navigationItem.default);
      (0, _chai.expect)(result[1].get('label')).to.equal('Two');
      (0, _chai.expect)(result[1].get('url')).to.equal('/two');
    });
    (0, _mocha.it)('serializes array of NavigationItems', function () {
      let transform = this.owner.lookup('transform:navigation-settings');
      let deserialized = Ember.A([_navigationItem.default.create({
        label: 'One',
        url: '/one'
      }), _navigationItem.default.create({
        label: 'Two',
        url: '/two'
      })]);
      let result = transform.serialize(deserialized);
      (0, _chai.expect)(result).to.equal('[{"label":"One","url":"/one"},{"label":"Two","url":"/two"}]');
    });
  });
});
define("ghost-admin/tests/unit/transforms/twitter-url-user-test", ["mocha", "chai", "ember-mocha"], function (_mocha, _chai, _emberMocha) {
  "use strict";

  (0, _mocha.describe)('Unit: Transform: twitter-url-user', function () {
    (0, _emberMocha.setupTest)();
    (0, _mocha.it)('deserializes twitter url', function () {
      let transform = this.owner.lookup('transform:twitter-url-user');
      let serialized = '@testuser';
      let result = transform.deserialize(serialized);
      (0, _chai.expect)(result).to.equal('https://twitter.com/testuser');
    });
    (0, _mocha.it)('serializes url to twitter username', function () {
      let transform = this.owner.lookup('transform:twitter-url-user');
      let deserialized = 'https://twitter.com/testuser';
      let result = transform.serialize(deserialized);
      (0, _chai.expect)(result).to.equal('@testuser');
    });
  });
});
define("ghost-admin/tests/unit/utils/ghost-paths-test", ["ghost-admin/utils/ghost-paths", "mocha", "chai"], function (_ghostPaths, _mocha, _chai) {
  "use strict";

  (0, _mocha.describe)('Unit: Util: ghost-paths', function () {
    (0, _mocha.describe)('join', function () {
      let {
        join
      } = (0, _ghostPaths.default)().url;
      (0, _mocha.it)('should join two or more paths, normalizing slashes', function () {
        let path;
        path = join('/one/', '/two/');
        (0, _chai.expect)(path).to.equal('/one/two/');
        path = join('/one', '/two/');
        (0, _chai.expect)(path).to.equal('/one/two/');
        path = join('/one/', 'two/');
        (0, _chai.expect)(path).to.equal('/one/two/');
        path = join('/one/', 'two/', '/three/');
        (0, _chai.expect)(path).to.equal('/one/two/three/');
        path = join('/one/', 'two', 'three/');
        (0, _chai.expect)(path).to.equal('/one/two/three/');
      });
      (0, _mocha.it)('should not change the slash at the beginning', function () {
        let path;
        path = join('one/');
        (0, _chai.expect)(path).to.equal('one/');
        path = join('one/', 'two');
        (0, _chai.expect)(path).to.equal('one/two/');
        path = join('/one/', 'two');
        (0, _chai.expect)(path).to.equal('/one/two/');
        path = join('one/', 'two', 'three');
        (0, _chai.expect)(path).to.equal('one/two/three/');
        path = join('/one/', 'two', 'three');
        (0, _chai.expect)(path).to.equal('/one/two/three/');
      });
      (0, _mocha.it)('should always return a slash at the end', function () {
        let path;
        path = join();
        (0, _chai.expect)(path).to.equal('/');
        path = join('');
        (0, _chai.expect)(path).to.equal('/');
        path = join('one');
        (0, _chai.expect)(path).to.equal('one/');
        path = join('one/');
        (0, _chai.expect)(path).to.equal('one/');
        path = join('one', 'two');
        (0, _chai.expect)(path).to.equal('one/two/');
        path = join('one', 'two/');
        (0, _chai.expect)(path).to.equal('one/two/');
      });
    });
  });
});
define("ghost-admin/tests/unit/validators/nav-item-test", ["ghost-admin/models/navigation-item", "ghost-admin/validators/nav-item", "mocha", "chai"], function (_navigationItem, _navItem, _mocha, _chai) {
  "use strict";

  const testInvalidUrl = function (url) {
    let navItem = _navigationItem.default.create({
      url
    });

    _navItem.default.check(navItem, 'url');

    (0, _chai.expect)(_navItem.default.get('passed'), `"${url}" passed`).to.be.false;
    (0, _chai.expect)(navItem.get('errors').errorsFor('url').toArray()).to.deep.equal([{
      attribute: 'url',
      message: 'You must specify a valid URL or relative path'
    }]);
    (0, _chai.expect)(navItem.get('hasValidated')).to.include('url');
  };

  const testValidUrl = function (url) {
    let navItem = _navigationItem.default.create({
      url
    });

    _navItem.default.check(navItem, 'url');

    (0, _chai.expect)(_navItem.default.get('passed'), `"${url}" failed`).to.be.true;
    (0, _chai.expect)(navItem.get('hasValidated')).to.include('url');
  };

  (0, _mocha.describe)('Unit: Validator: nav-item', function () {
    (0, _mocha.it)('requires label presence', function () {
      let navItem = _navigationItem.default.create();

      _navItem.default.check(navItem, 'label');

      (0, _chai.expect)(_navItem.default.get('passed')).to.be.false;
      (0, _chai.expect)(navItem.get('errors').errorsFor('label').toArray()).to.deep.equal([{
        attribute: 'label',
        message: 'You must specify a label'
      }]);
      (0, _chai.expect)(navItem.get('hasValidated')).to.include('label');
    });
    (0, _mocha.it)('requires url presence', function () {
      let navItem = _navigationItem.default.create();

      _navItem.default.check(navItem, 'url');

      (0, _chai.expect)(_navItem.default.get('passed')).to.be.false;
      (0, _chai.expect)(navItem.get('errors').errorsFor('url').toArray()).to.deep.equal([{
        attribute: 'url',
        message: 'You must specify a URL or relative path'
      }]);
      (0, _chai.expect)(navItem.get('hasValidated')).to.include('url');
    });
    (0, _mocha.it)('fails on invalid url values', function () {
      let invalidUrls = ['test@example.com', '/has spaces', 'no-leading-slash', 'http://example.com/with spaces'];
      invalidUrls.forEach(function (url) {
        testInvalidUrl(url);
      });
    });
    (0, _mocha.it)('passes on valid url values', function () {
      let validUrls = ['http://localhost:2368', 'http://localhost:2368/some-path', 'https://localhost:2368/some-path', '//localhost:2368/some-path', 'http://localhost:2368/#test', 'http://localhost:2368/?query=test&another=example', 'http://localhost:2368/?query=test&another=example#test', 'tel:01234-567890', 'mailto:test@example.com', 'http://some:user@example.com:1234', '/relative/path'];
      validUrls.forEach(function (url) {
        testValidUrl(url);
      });
    });
    (0, _mocha.it)('validates url and label by default', function () {
      let navItem = _navigationItem.default.create();

      _navItem.default.check(navItem);

      (0, _chai.expect)(navItem.get('errors').errorsFor('label')).to.not.be.empty;
      (0, _chai.expect)(navItem.get('errors').errorsFor('url')).to.not.be.empty;
      (0, _chai.expect)(_navItem.default.get('passed')).to.be.false;
    });
  });
});
define("ghost-admin/tests/unit/validators/post-test", ["ghost-admin/mixins/validation-engine", "mocha", "chai"], function (_validationEngine, _mocha, _chai) {
  "use strict";

  const Post = Ember.Object.extend(_validationEngine.default, {
    validationType: 'post',
    email: null
  });
  (0, _mocha.describe)('Unit: Validator: post', function () {
    (0, _mocha.describe)('canonicalUrl', function () {
      (0, _mocha.it)('can be blank', async function () {
        let post = Post.create({
          canonicalUrl: ''
        });
        let passed = await post.validate({
          property: 'canonicalUrl'
        }).then(() => true);
        (0, _chai.expect)(passed, 'passed').to.be.true;
        (0, _chai.expect)(post.hasValidated).to.include('canonicalUrl');
      });
      (0, _mocha.it)('can be an absolute URL', async function () {
        let post = Post.create({
          canonicalUrl: 'http://example.com'
        });
        let passed = await post.validate({
          property: 'canonicalUrl'
        }).then(() => true);
        (0, _chai.expect)(passed, 'passed').to.be.true;
        (0, _chai.expect)(post.hasValidated).to.include('canonicalUrl');
      });
      (0, _mocha.it)('can be a relative URL', async function () {
        let post = Post.create({
          canonicalUrl: '/my-other-post'
        });
        let passed = await post.validate({
          property: 'canonicalUrl'
        }).then(() => true);
        (0, _chai.expect)(passed, 'passed').to.be.true;
        (0, _chai.expect)(post.hasValidated).to.include('canonicalUrl');
      });
      (0, _mocha.it)('cannot be a random string', async function () {
        let post = Post.create({
          canonicalUrl: 'asdfghjk'
        });
        let passed = await post.validate({
          property: 'canonicalUrl'
        }).then(() => true).catch(() => false);
        (0, _chai.expect)(passed, 'passed').to.be.false;
        (0, _chai.expect)(post.hasValidated).to.include('canonicalUrl');
        let error = post.errors.errorsFor('canonicalUrl').get(0);
        (0, _chai.expect)(error.attribute).to.equal('canonicalUrl');
        (0, _chai.expect)(error.message).to.equal('Please enter a valid URL');
      });
      (0, _mocha.it)('cannot be too long', async function () {
        let post = Post.create({
          canonicalUrl: `http://example.com/${new Array(1983).join('x')}`
        });
        let passed = await post.validate({
          property: 'canonicalUrl'
        }).then(() => true).catch(() => false);
        (0, _chai.expect)(passed, 'passed').to.be.false;
        (0, _chai.expect)(post.hasValidated).to.include('canonicalUrl');
        let error = post.errors.errorsFor('canonicalUrl').get(0);
        (0, _chai.expect)(error.attribute).to.equal('canonicalUrl');
        (0, _chai.expect)(error.message).to.equal('Canonical URL is too long, max 2000 chars');
      });
    });
  });
});
define("ghost-admin/tests/unit/validators/tag-settings-test", ["ghost-admin/mixins/validation-engine", "mocha", "chai"], function (_validationEngine, _mocha, _chai) {
  "use strict";

  const Tag = Ember.Object.extend(_validationEngine.default, {
    validationType: 'tag',
    name: null,
    description: null,
    metaTitle: null,
    metaDescription: null
  }); // TODO: These tests have way too much duplication, consider creating test
  // helpers for validations
  // TODO: Move testing of validation-engine behaviour into validation-engine-test
  // and replace these tests with specific validator tests

  (0, _mocha.describe)('Unit: Validator: tag-settings', function () {
    (0, _mocha.it)('validates all fields by default', function () {
      let tag = Tag.create({});
      let properties = tag.get('validators.tag.properties'); // TODO: This is checking implementation details rather than expected
      // behaviour. Replace once we have consistent behaviour (see below)

      (0, _chai.expect)(properties, 'properties').to.include('name');
      (0, _chai.expect)(properties, 'properties').to.include('slug');
      (0, _chai.expect)(properties, 'properties').to.include('description');
      (0, _chai.expect)(properties, 'properties').to.include('metaTitle');
      (0, _chai.expect)(properties, 'properties').to.include('metaDescription'); // TODO: .validate (and  by extension .save) doesn't currently affect
      // .hasValidated - it would be good to make this consistent.
      // The following tests currently fail:
      //
      // run(() => {
      //     tag.validate();
      // });
      //
      // expect(tag.get('hasValidated'), 'hasValidated').to.include('name');
      // expect(tag.get('hasValidated'), 'hasValidated').to.include('description');
      // expect(tag.get('hasValidated'), 'hasValidated').to.include('metaTitle');
      // expect(tag.get('hasValidated'), 'hasValidated').to.include('metaDescription');
    });
    (0, _mocha.it)('passes with valid name', function () {
      // longest valid name
      let tag = Tag.create({
        name: new Array(192).join('x')
      });
      let passed = false;
      (0, _chai.expect)(tag.get('name').length, 'name length').to.equal(191);
      Ember.run(() => {
        tag.validate({
          property: 'name'
        }).then(() => {
          passed = true;
        });
      });
      (0, _chai.expect)(passed, 'passed').to.be.true;
      (0, _chai.expect)(tag.get('hasValidated'), 'hasValidated').to.include('name');
    });
    (0, _mocha.it)('validates name presence', function () {
      let tag = Tag.create();
      let passed = false;
      let nameErrors; // TODO: validator is currently a singleton meaning state leaks
      // between all objects that use it. Each object should either
      // get it's own validator instance or validator objects should not
      // contain state. The following currently fails:
      //
      // let validator = tag.get('validators.tag')
      // expect(validator.get('passed'), 'passed').to.be.false;

      Ember.run(() => {
        tag.validate({
          property: 'name'
        }).then(() => {
          passed = true;
        });
      });
      nameErrors = tag.get('errors').errorsFor('name').get(0);
      (0, _chai.expect)(nameErrors.attribute, 'errors.name.attribute').to.equal('name');
      (0, _chai.expect)(nameErrors.message, 'errors.name.message').to.equal('You must specify a name for the tag.');
      (0, _chai.expect)(passed, 'passed').to.be.false;
      (0, _chai.expect)(tag.get('hasValidated'), 'hasValidated').to.include('name');
    });
    (0, _mocha.it)('validates names starting with a comma', function () {
      let tag = Tag.create({
        name: ',test'
      });
      let passed = false;
      let nameErrors;
      Ember.run(() => {
        tag.validate({
          property: 'name'
        }).then(() => {
          passed = true;
        });
      });
      nameErrors = tag.get('errors').errorsFor('name').get(0);
      (0, _chai.expect)(nameErrors.attribute, 'errors.name.attribute').to.equal('name');
      (0, _chai.expect)(nameErrors.message, 'errors.name.message').to.equal('Tag names can\'t start with commas.');
      (0, _chai.expect)(passed, 'passed').to.be.false;
      (0, _chai.expect)(tag.get('hasValidated'), 'hasValidated').to.include('name');
    });
    (0, _mocha.it)('validates name length', function () {
      // shortest invalid name
      let tag = Tag.create({
        name: new Array(193).join('x')
      });
      let passed = false;
      let nameErrors;
      (0, _chai.expect)(tag.get('name').length, 'name length').to.equal(192);
      Ember.run(() => {
        tag.validate({
          property: 'name'
        }).then(() => {
          passed = true;
        });
      });
      nameErrors = tag.get('errors').errorsFor('name')[0];
      (0, _chai.expect)(nameErrors.attribute, 'errors.name.attribute').to.equal('name');
      (0, _chai.expect)(nameErrors.message, 'errors.name.message').to.equal('Tag names cannot be longer than 191 characters.');
      (0, _chai.expect)(passed, 'passed').to.be.false;
      (0, _chai.expect)(tag.get('hasValidated'), 'hasValidated').to.include('name');
    });
    (0, _mocha.it)('passes with valid slug', function () {
      // longest valid slug
      let tag = Tag.create({
        slug: new Array(192).join('x')
      });
      let passed = false;
      (0, _chai.expect)(tag.get('slug').length, 'slug length').to.equal(191);
      Ember.run(() => {
        tag.validate({
          property: 'slug'
        }).then(() => {
          passed = true;
        });
      });
      (0, _chai.expect)(passed, 'passed').to.be.true;
      (0, _chai.expect)(tag.get('hasValidated'), 'hasValidated').to.include('slug');
    });
    (0, _mocha.it)('validates slug length', function () {
      // shortest invalid slug
      let tag = Tag.create({
        slug: new Array(193).join('x')
      });
      let passed = false;
      let slugErrors;
      (0, _chai.expect)(tag.get('slug').length, 'slug length').to.equal(192);
      Ember.run(() => {
        tag.validate({
          property: 'slug'
        }).then(() => {
          passed = true;
        });
      });
      slugErrors = tag.get('errors').errorsFor('slug')[0];
      (0, _chai.expect)(slugErrors.attribute, 'errors.slug.attribute').to.equal('slug');
      (0, _chai.expect)(slugErrors.message, 'errors.slug.message').to.equal('URL cannot be longer than 191 characters.');
      (0, _chai.expect)(passed, 'passed').to.be.false;
      (0, _chai.expect)(tag.get('hasValidated'), 'hasValidated').to.include('slug');
    });
    (0, _mocha.it)('passes with a valid description', function () {
      // longest valid description
      let tag = Tag.create({
        description: new Array(501).join('x')
      });
      let passed = false;
      (0, _chai.expect)(tag.get('description').length, 'description length').to.equal(500);
      Ember.run(() => {
        tag.validate({
          property: 'description'
        }).then(() => {
          passed = true;
        });
      });
      (0, _chai.expect)(passed, 'passed').to.be.true;
      (0, _chai.expect)(tag.get('hasValidated'), 'hasValidated').to.include('description');
    });
    (0, _mocha.it)('validates description length', function () {
      // shortest invalid description
      let tag = Tag.create({
        description: new Array(502).join('x')
      });
      let passed = false;
      let errors;
      (0, _chai.expect)(tag.get('description').length, 'description length').to.equal(501);
      Ember.run(() => {
        tag.validate({
          property: 'description'
        }).then(() => {
          passed = true;
        });
      });
      errors = tag.get('errors').errorsFor('description')[0];
      (0, _chai.expect)(errors.attribute, 'errors.description.attribute').to.equal('description');
      (0, _chai.expect)(errors.message, 'errors.description.message').to.equal('Description cannot be longer than 500 characters.'); // TODO: tag.errors appears to be a singleton and previous errors are
      // not cleared despite creating a new tag object
      //
      // console.log(JSON.stringify(tag.get('errors')));
      // expect(tag.get('errors.length')).to.equal(1);

      (0, _chai.expect)(passed, 'passed').to.be.false;
      (0, _chai.expect)(tag.get('hasValidated'), 'hasValidated').to.include('description');
    }); // TODO: we have both metaTitle and metaTitle property names on the
    // model/validator respectively - this should be standardised

    (0, _mocha.it)('passes with a valid metaTitle', function () {
      // longest valid metaTitle
      let tag = Tag.create({
        metaTitle: new Array(301).join('x')
      });
      let passed = false;
      (0, _chai.expect)(tag.get('metaTitle').length, 'metaTitle length').to.equal(300);
      Ember.run(() => {
        tag.validate({
          property: 'metaTitle'
        }).then(() => {
          passed = true;
        });
      });
      (0, _chai.expect)(passed, 'passed').to.be.true;
      (0, _chai.expect)(tag.get('hasValidated'), 'hasValidated').to.include('metaTitle');
    });
    (0, _mocha.it)('validates metaTitle length', function () {
      // shortest invalid metaTitle
      let tag = Tag.create({
        metaTitle: new Array(302).join('x')
      });
      let passed = false;
      let errors;
      (0, _chai.expect)(tag.get('metaTitle').length, 'metaTitle length').to.equal(301);
      Ember.run(() => {
        tag.validate({
          property: 'metaTitle'
        }).then(() => {
          passed = true;
        });
      });
      errors = tag.get('errors').errorsFor('metaTitle')[0];
      (0, _chai.expect)(errors.attribute, 'errors.metaTitle.attribute').to.equal('metaTitle');
      (0, _chai.expect)(errors.message, 'errors.metaTitle.message').to.equal('Meta Title cannot be longer than 300 characters.');
      (0, _chai.expect)(passed, 'passed').to.be.false;
      (0, _chai.expect)(tag.get('hasValidated'), 'hasValidated').to.include('metaTitle');
    }); // TODO: we have both metaDescription and metaDescription property names on
    // the model/validator respectively - this should be standardised

    (0, _mocha.it)('passes with a valid metaDescription', function () {
      // longest valid description
      let tag = Tag.create({
        metaDescription: new Array(501).join('x')
      });
      let passed = false;
      (0, _chai.expect)(tag.get('metaDescription').length, 'metaDescription length').to.equal(500);
      Ember.run(() => {
        tag.validate({
          property: 'metaDescription'
        }).then(() => {
          passed = true;
        });
      });
      (0, _chai.expect)(passed, 'passed').to.be.true;
      (0, _chai.expect)(tag.get('hasValidated'), 'hasValidated').to.include('metaDescription');
    });
    (0, _mocha.it)('validates metaDescription length', function () {
      // shortest invalid metaDescription
      let tag = Tag.create({
        metaDescription: new Array(502).join('x')
      });
      let passed = false;
      let errors;
      (0, _chai.expect)(tag.get('metaDescription').length, 'metaDescription length').to.equal(501);
      Ember.run(() => {
        tag.validate({
          property: 'metaDescription'
        }).then(() => {
          passed = true;
        });
      });
      errors = tag.get('errors').errorsFor('metaDescription')[0];
      (0, _chai.expect)(errors.attribute, 'errors.metaDescription.attribute').to.equal('metaDescription');
      (0, _chai.expect)(errors.message, 'errors.metaDescription.message').to.equal('Meta Description cannot be longer than 500 characters.');
      (0, _chai.expect)(passed, 'passed').to.be.false;
      (0, _chai.expect)(tag.get('hasValidated'), 'hasValidated').to.include('metaDescription');
    });
  });
});
define('ghost-admin/config/environment', [], function() {
  var prefix = 'ghost-admin';
try {
  var metaName = prefix + '/config/environment';
  var rawConfig = document.querySelector('meta[name="' + metaName + '"]').getAttribute('content');
  var config = JSON.parse(decodeURIComponent(rawConfig));

  var exports = { 'default': config };

  Object.defineProperty(exports, '__esModule', { value: true });

  return exports;
}
catch(err) {
  throw new Error('Could not read config from meta tag with name "' + metaName + '".');
}

});

require('ghost-admin/tests/test-helper');
EmberENV.TESTS_FILE_LOADED = true;
//# sourceMappingURL=tests.map
