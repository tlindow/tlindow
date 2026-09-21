.PHONY: coverage-bar coverage-bar-check

# Rewrite the README provenance bar from the full working tree.
coverage-bar:
	python3 scripts/check_typing_coverage.py --write-bar

# Fail when the committed README bar does not match the measured working tree.
coverage-bar-check:
	python3 scripts/check_typing_coverage.py --check-bar
