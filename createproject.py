# -*- coding: utf-8 -*- #
# Copyright 2011 Google Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http:#www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#

from google.appengine.api import users

from google.appengine.ext import db
from google.appengine.ext import webapp
from google.appengine.ext.webapp import template
 

from models import Project
from util import *

import webapp2

class CreateProjectHandler(webapp2.RequestHandler):
  def get(self):
    self.response.out.write(
        template.render('createproject.html', {}))

class CreateProjectActionHandler(webapp2.RequestHandler):
  def post(self):
    title = self.request.POST.get('title')
    code = self.request.POST.get('code')
    admins = [Util.getUsernameFromEmail(users.get_current_user().email())]
    project = Project(title=title, code=code, admins=admins)
    project.put()
    self.redirect('/' + project.code + '/organize')

app = webapp2.WSGIApplication(
      [
        ('/createproject', CreateProjectHandler),
        ('/createprojectaction', CreateProjectActionHandler)
      ], debug=True)

