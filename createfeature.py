#
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

class CreateFeatureHandler(webapp2.RequestHandler):
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

    subprojectCode = self.request.GET.get('subprojectCode')
    subproject = Subproject.gql("WHERE code = '" + subprojectCode + "'").get()
    if project == None:
      self.response.headers['Status'] = 403
      self.response.out.write('No sub-project with code ' + projectCode)
      return

    # TODO(manucornet): Check uniqueness.
    code = self.request.GET.get('code')
    title = self.request.GET.get('title')
    bugNumber = self.getOptionalNumberParam('bugNumber')
    notes = self.request.GET.get('notes')
    owner = self.request.GET.get('owner')
    if owner == None:
      owner = ""
    tags = self.getArrayParam('tags')
    feature = Feature(title=title, code=code, bugNumber=bugNumber, notes=notes,
        subprojectCode=subprojectCode, owner=owner, tags=tags)
    previousFeature = Feature.gql("WHERE code = '" + code + "'").get();
    if previousFeature != None:
      previousFeature.delete()
    feature.put()


app = webapp2.WSGIApplication(
        [
          ('/(.*)/createfeature', CreateFeatureHandler)
        ], debug=True)

  

