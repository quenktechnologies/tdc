
.PHONY: clean
clean: 
	rm -R run mod index.ts start.ts;
	
.PHONY: test
test: 
	mkdir -p run mod; cp -R app/* mod; cp -R app/* run; \
	../lib/cli.js run && ../lib/cli.js --modules mod;

.PHONY: all
all: clean test
