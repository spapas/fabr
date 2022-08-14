https://github.com/casey/just

set shell := ["cmd.exe", "/c"]


recipe-name:
  echo This is a recipe!


list:
  dir

# this is a comment
another-recipe:
  @echo 'This is another recipe.'