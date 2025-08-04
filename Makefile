# ---------- overridable ----------
REGISTRY      ?= docker.io
DOCKER_USER   ?= elemusbarrios
IMAGE_NAME    ?= x-trends
TAGS          ?= latest 1.0.1

# ---------- computed --------------
IMAGE_FULL_NAME := $(REGISTRY)/$(DOCKER_USER)/$(IMAGE_NAME)
DEFAULT_TAG := $(firstword $(TAGS))
### ---------------  Targets  -------------------------------------------

.PHONY: all
all: clean build                  ## limpia y compila

.PHONY: build
build:                            ## build + retag para cada TAG
	docker build -t $(IMAGE_FULL_NAME):$(DEFAULT_TAG) .
	$(foreach tag,$(filter-out $(DEFAULT_TAG),$(TAGS)),\
	  docker tag $(IMAGE_FULL_NAME):$(DEFAULT_TAG) $(IMAGE_FULL_NAME):$(tag);)

.PHONY: publish
publish:                          ## push de todas las TAGS
	$(foreach tag,$(TAGS),\
	  docker push $(IMAGE_FULL_NAME):$(tag);)

.PHONY: clean
clean:                            ## borra imágenes locales + prune
	-$(foreach tag,$(TAGS),docker rmi -f $(IMAGE_FULL_NAME):$(tag);)
	docker system prune -f

.PHONY: help
help:                             ## imprime ayuda inline
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	  sort | \
	  awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'
