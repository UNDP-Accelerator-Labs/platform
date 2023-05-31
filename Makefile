help:
	@echo "The following make targets are available:"
	@echo "name	generate a unique permanent name for the current commit"
	@echo "git-check	ensures no git visible files have been altered"
	@echo "run-web	runs the webserver"

export LC_ALL=C
export LANG=C

name:
	git describe --abbrev=10 --tags HEAD

git-check:
	./sh/git_check.sh

run-web:
	CMD=start ./sh/run.sh
