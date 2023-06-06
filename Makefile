help:
	@echo "The following make targets are available:"
	@echo "install-python	install all python dependencies"
	@echo "lint-comment	ensures fixme comments are grepable"
	@echo "lint-emptyinit	main inits must be empty"
	@echo "lint-flake8	run flake8 checker to deteck missing trailing comma"
	@echo "lint-forgottenformat	ensures format strings are used"
	@echo "lint-indent	run indent format check"
	@echo "lint-pycodestyle	run linter check using pycodestyle standard"
	@echo "lint-pycodestyle-debug	run linter in debug mode"
	@echo "lint-pyi	Ensure no regular python files exist in stubs"
	@echo "lint-pylint	run linter check using pylint standard"
	@echo "lint-requirements	run requirements check"
	@echo "lint-stringformat	run string format check"
	@echo "lint-type-check	run type check"
	@echo "lint-all	run all lints"
	@echo "pre-commit 	sort python package imports using isort"
	@echo "requirements-check	check whether the env differs from the requirements file"
	@echo "requirements-complete	check whether the requirements file is complete"
	@echo "create-user	interactively inserts a new user into the login db"
	@echo "name	generate a unique permanent name for the current commit"
	@echo "current-version	computes the current version"
	@echo "next-version	computes the next version"
	@echo "git-check	ensures no git visible files have been altered"
	@echo "run-web	runs the webserver"
	@echo "run-sass	runs the sass compiler"

export LC_ALL=C
export LANG=C

PYTHON=python3

lint-comment:
	! ./sh/findpy.sh \
	| xargs grep --color=always -nE \
	  '#.*(todo|xxx|fixme|n[oO][tT][eE]:|Note:|nopep8\s*$$)|.\"^s%'

lint-emptyinit:
	[ ! -s py/__init__.py ]

lint-pyi:
	./sh/pyi.sh

lint-stringformat:
	! ./sh/findpy.sh \
	| xargs grep --color=always -nE "%[^'\"]*\"\\s*%\\s*"

lint-indent:
	! ./sh/findpy.sh \
	| xargs grep --color=always -nE "^(\s{4})*\s{1,3}\S.*$$"

lint-forgottenformat:
	! PYTHON=$(PYTHON) ./sh/forgottenformat.sh

lint-requirements:
	locale
	cat requirements.txt
	sort -ufc requirements.txt

lint-pycodestyle:
	./sh/findpy.sh | sort
	./sh/findpy.sh | sort | xargs pycodestyle --show-source

lint-pycodestyle-debug:
	./sh/findpy.sh | sort
	./sh/findpy.sh \
	| sort | xargs pycodestyle -v --show-source

lint-pylint:
	./sh/findpy.sh | sort
	./sh/findpy.sh | sort | xargs pylint -j 6 -v

lint-type-check:
	mypy --exclude=^venv/ --config-file mypy.ini py/

lint-flake8:
	flake8 --verbose --select C812,C815,I001,I002,I003,I004,I005 --exclude \
	venv,.git,.mypy_cache --show-source py/

lint-all: \
	lint-comment \
	lint-emptyinit \
	lint-pyi \
	lint-stringformat \
	lint-indent \
	lint-forgottenformat \
	lint-requirements \
	requirements-complete \
	lint-pycodestyle \
	lint-pylint \
	lint-type-check \
	lint-flake8

install-python:
	PYTHON=$(PYTHON) ./sh/pyinstall.sh

requirements-check:
	PYTHON=$(PYTHON) ./sh/requirements_check.sh $(FILE)

requirements-complete:
	PYTHON=$(PYTHON) ./sh/requirements_complete.sh $(FILE)

pre-commit:
	pre-commit install
	isort py/

create-user:
	./sh/create_user.sh

name:
	git describe --abbrev=10 --tags HEAD

current-version:
	./sh/version.sh --current

next-version:
	./sh/version.sh

git-check:
	./sh/git_check.sh

run-web:
	CMD=start ./sh/run.sh

run-sass:
	CMD=sass ./sh/run.sh
