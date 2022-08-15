# https://github.com/casey/just

set shell := ["cmd.exe", "/c"]


htserve:
  py -3 -m http.server


list:
  dir

# this is a comment
another-recipe:
  @echo 'This is another recipe.'