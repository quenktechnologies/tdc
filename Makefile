
lib: $(shell find src -name \*.ts)
	rm -R lib || true
	mkdir -p $@ 
	cp -R src/* $@;
	./node_modules/.bin/tsc -p src
	chmod +x lib/main.js

.PHONY: clean
clean:
	@rm -R ./lib 2> /dev/null || true

.PHONY: test
test: 
	./node_modules/.bin/mocha --opts mocha.opts test/unit && \
	./node_modules/.bin/mocha --opts mocha.opts test/feat

.PHONY: docs
docs: 
	./node_modules/.bin/typedoc \
	--mode modules \
	--out $@ \
	--excludeExternals \
	--excludeNotExported \
	--excludePrivate \
	--tsconfig lib/tsconfig.json \
	--theme minimal && \
	echo 'DO NOT DELETE!' > docs/.nojekyll 

