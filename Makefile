.PHONY: coverage-svg coverage-svg-check

# Rebuild assets/coverage-bar.svg from the full working tree.
coverage-svg:
	python3 scripts/check_typing_coverage.py --write-svg assets/coverage-bar.svg

# Fail when the committed bar does not match the measured working tree.
coverage-svg-check:
	python3 scripts/check_typing_coverage.py --check-svg assets/coverage-bar.svg
