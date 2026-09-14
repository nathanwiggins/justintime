Here is my vision for the Generator feature in our project. It transforms the Budget Justification Creation into a 3 phase process.

# Phase 1: Generation
-This is the generation sequence that currently exists.
-The only change is that "Source Truth" extraction only pulls one value: Total Budget.
 -This call is run 5 times consecutively, and the mode of the results is what is kept.

# Phase 2: Validation
-All Extracted Data should be preserved to this stage.
-The first step is setting up values as LINKED values (matching them to a specific cell in the spreadsheet if possible) or CALCULATED values (indicating which values comprise that calculated value)
-The last step is matching the Source Truth Total Budget against the equivalent calculated overall total.
 -If the values match, the user gets to preview the generated justification and gets a prompt that reads, "Artificial Intelligence (AI) tried its best to give a starting point for this budget justification. This justification passed validation, but some inaccuracies are possible in every generation attempt. Would you like to keep this version, or generate a new starting point? [Generate New Version] -> Return to Phase 1 / [Keep This Version] -> Proceed to Phase 3
 -If the values do not match, the user gets to preview the generated justification and gets a prompt that reads, "Artificial Intelligence (AI) tried its best to give a starting point for this budget justification, but our validation noticed that there are some inaccuracies. Some inaccuracies are possible in every generation attempt. Would you like to keep this version, or generate a new starting point? [Generate New Version] -> Return to Phase 1 / [Keep This Version] -> Proceed to Phase 3

# Phase 3: Editing
-This phase takes place in an interactive side-by-side document editor / spreadsheet viewer.
-There are two types of data: free-text and values
  -Free text behaves with no special rules
  -Values are special. They are either (a) LINKED to a specific cell in the spreadsheet (so that if the user uploads a new spreadsheet later with a different value in that cell, the value will update in the document as well) or (b) CALCULATED from other values in the DOCUMENT (the artifact we built earlier highlights this structure)
-The user can interact with this setup in a number of ways
 -The user can edit the document freely
 -The user can link, unlink, or re-link values to cells in the spreadsheet
 -The user can add, remove, or adjust calculated values

 # Project Spaces
 -To help keep projects organized, we will also develop a project feature that will allow both the Generator and the Verifier to interact together the way that they should.
 -The user can set up projects like a file system, all using local storage.