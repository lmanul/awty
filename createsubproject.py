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
 

import urllib
import webapp2

from models import *
from util import *

class CreateSubprojectHandler(webapp2.RequestHandler):
  def getOptionalNumberParam(self, paramName):
    paramString = self.request.GET.get(paramName)
    if paramString == None:
      return 0
    return 0 if len(paramString) == 0 else int(paramString)

  def getArrayParam(self, paramName):
    paramString = self.request.GET.get(paramName)
    if paramString == None:
      return []
    paramString = paramString.strip()
    tags = paramString.split(',')
    return [tag.strip() for tag in tags]

  def get(self, projectCodeParam):
    projectCode = urllib.unquote(projectCodeParam)
    project = Project.gql("WHERE code = '" + projectCode + "'").get()
    if project == None:
      self.response.headers['Status'] = 403
      self.response.out.write('No project with code ' + projectCode)
      return

    # Random code.
    code = self.request.GET.get('code')
    title = self.request.GET.get('title')
    admins = self.getArrayParam('admins')
    if len(admins) == 0:
      admins = [Util.getUsernameFromEmail(users.get_current_user().email())]
    subproject = Subproject(title=title, code=code,
        projectCode=projectCode, admins=admins)
    previousSubproject = Subproject.gql("WHERE code = '" + code + "'").get();
    if previousSubproject != None:
      previousSubproject.delete()
    subproject.put()


app = webapp2.WSGIApplication(
        [
          ('/(.*)/createsubproject', CreateSubprojectHandler)
        ], debug=True)
