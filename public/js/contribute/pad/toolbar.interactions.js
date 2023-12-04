function initToolbarInteractions(kwargs) {
  let { metafields, type: objecttype, main } = kwargs;
  if (!mediaSize) var mediaSize = getMediaSize();

  const object = d3.select('data[name="object"]').node()?.value;

  if (!metafields && !objecttype) {
    const { metafields: pmeta } = JSON.parse(
      d3.select('data[name="site"]').node()?.value,
    );
    const { type } = JSON.parse(d3.select('data[name="data"]').node().value);
    metafields = pmeta;
    objecttype = type;
  }

  // LOAD THE ICONS IN THE TOOLBAR
  d3.selectAll('.meta-icon').each(function () {
    const { src, fallback } = this.dataset;
    const node = this;

    const img = new Image();
    img.onload = function () {
      node.src = this.src;
    };
    img.onerror = function (err) {
      if (err) console.log(err);
      img.src = fallback;
    };

    img.src = src;
  });

  const objectdata = { object, type: objecttype, main };

  // ADD ALL INTERACTION WITH MEDIA AND META INPUT BUTTONS
  d3.select('.media-input-group #input-media-section')
    .on('mousedown', function () {
      this['__active_node__'] = d3
        .selectAll('.media-layout.focus')
        .nodes()
        ?.last()?.nextSibling;
    })
    .on('click', function () {
      addSection({
        lang: language,
        sibling: this['__active_node__'],
        focus: true,
        objectdata,
      });
      this['__active_node__'] = null;
    });

  d3.select('.media-input-group #input-media-img + label').on(
    'mousedown',
    function () {
      this.control['__active_node__'] = d3
        .selectAll('.media-container.focus, .meta-container.focus')
        .nodes()
        ?.last()?.nextSibling;
    },
  );
  d3.select('.media-input-group #input-media-img').on('change', function () {
    uploadImg({
      form: this.form,
      lang: language,
      sibling: this['__active_node__'],
      focus: true,
      objectdata,
    });
    this['__active_node__'] = null;
  });

  d3.select('.media-input-group #input-media-video + label').on(
    'mousedown',
    function () {
      this.control['__active_node__'] = d3
        .selectAll('.media-container.focus, .meta-container.focus')
        .nodes()
        ?.last()?.nextSibling;
    },
  );
  d3.select('.media-input-group #input-media-video').on('change', function () {
    uploadVideo({
      form: this.form,
      lang: language,
      sibling: this['__active_node__'],
      focus: true,
      objectdata,
    });
    this['__active_node__'] = null;
  });

  d3.select('.media-input-group #input-media-drawing')
    .on('mousedown', function () {
      this['__active_node__'] = d3
        .selectAll('.media-container.focus, .meta-container.focus')
        .nodes()
        ?.last()?.nextSibling;
    })
    .on('click', function () {
      addDrawing({
        lang: language,
        sibling: this['__active_node__'],
        focus: true,
        objectdata,
      });
      this['__active_node__'] = null;
    });

  d3.select('.media-input-group #input-media-txt')
    .on('mousedown', function () {
      this['__active_node__'] = d3
        .selectAll('.media-container.focus, .meta-container.focus')
        .nodes()
        ?.last()?.nextSibling;
    })
    .on('click', function () {
      addTxt({
        lang: language,
        sibling: this['__active_node__'],
        focus: true,
        objectdata,
      });
      this['__active_node__'] = null;
    });

  d3.select('.media-input-group #input-media-embed')
    .on('mousedown', function () {
      this['__active_node__'] = d3
        .selectAll('.media-container.focus, .meta-container.focus')
        .nodes()
        ?.last()?.nextSibling;
    })
    .on('click', function () {
      addEmbed({
        lang: language,
        sibling: this['__active_node__'],
        focus: true,
        objectdata,
      });
      this['__active_node__'] = null;
    });

  d3.select('.media-input-group #input-media-checklist')
    .on('mousedown', function () {
      this['__active_node__'] = d3
        .selectAll('.media-container.focus, .meta-container.focus')
        .nodes()
        ?.last()?.nextSibling;
    })
    .on('click', function () {
      addChecklist({
        lang: language,
        sibling: this['__active_node__'],
        focus: true,
        objectdata,
      });
      this['__active_node__'] = null;
    });

  d3.select('.media-input-group #input-media-radiolist')
    .on('mousedown', function () {
      this['__active_node__'] = d3
        .selectAll('.media-container.focus, .meta-container.focus')
        .nodes()
        ?.last()?.nextSibling;
    })
    .on('click', function () {
      addRadiolist({
        lang: language,
        sibling: this['__active_node__'],
        focus: true,
        objectdata,
      });
      this['__active_node__'] = null;
    });

  metafields.forEach((d) => {
    d3.select(`.media-input-group #input-meta-${d.label}`)
      .on('mouseover', function () {
        d3.select(this)
          .select('label')
          .style('width', function () {
            return `${this.scrollWidth}px`;
          });
      })
      .on('mouseout', function () {
        d3.select(this).select('label').style('width', 0);
      })
      .on('mousedown', function () {
        this['__active_node__'] =
          d3
            .selectAll('.media-container.focus, .meta-container.focus')
            .nodes()
            ?.last()?.nextSibling || null;
      })
      .on('click', function () {
        const data = {
          level: 'meta',
          name: d.label,
          constraint: d.limit || null,
          required: d.required,
          instruction: d.instruction,
          options: d.options || null,
        };
        if (d.type === 'txt')
          addTxt({
            data,
            lang: language,
            sibling: this['__active_node__'],
            focus: true,
            objectdata,
          });
        if (d.type === 'embed')
          addEmbed({
            data,
            lang: language,
            sibling: this['__active_node__'],
            focus: true,
            objectdata,
          });
        if (d.type === 'drawing')
          addDrawing({
            data,
            lang: language,
            sibling: this['__active_node__'],
            focus: true,
            objectdata,
          });
        if (d.type === 'checklist')
          addChecklist({
            data,
            lang: language,
            sibling: this['__active_node__'],
            focus: true,
            objectdata,
          });
        if (d.type === 'radiolist')
          addRadiolist({
            data,
            lang: language,
            sibling: this['__active_node__'],
            focus: true,
            objectdata,
          });
        // THE FOLLOWING ARE ALWAYS META
        if (d.type === 'tag')
          addTags({
            data,
            lang: language,
            sibling: this['__active_node__'],
            focus: true,
            objectdata,
          });
        if (d.type === 'index')
          addIndexes({
            data,
            lang: language,
            sibling: this['__active_node__'],
            focus: true,
            objectdata,
          });
        if (d.type === 'location') {
          // ADD DEFAULT LOCATION FOR MAP CENTERING
          data.default_location = JSON.parse(
            d3.select('data[name="location"]').node().value,
          ).lnglat;
          addLocations({
            data,
            lang: language,
            sibling: this['__active_node__'],
            focus: true,
            objectdata,
          });
        }
        if (d.type === 'attachment')
          addAttachment({
            data,
            lang: language,
            sibling: this['__active_node__'],
            focus: true,
            objectdata,
          });

        d3.select(this).select('label').style('width', 0);
        this['__active_node__'] = null;
      });
  });

  // DETERMINE WHETHER THE INPUT BAR NEEDS TO BE NAVIGATED (i.e., SCROLLED)
  if (objecttype === 'blank') {
    d3.select('.media-input-group').each(function () {
      const node = this;
      const sel = d3.select(this);
      const inner = sel.select('.inner');
      const height = inner.node().clientHeight || inner.node().offsetHeight;
      const scrollheight = inner.node().scrollHeight;
      const scrolltop = inner.node().scrollTop;
      const buttonheight =
        inner.select('button').node().clientHeight ||
        inner.select('button').node().offsetHeight;

      sel.classed('overflowing', scrollheight > height + buttonheight);

      sel
        .select('button.scroll-up')
        .classed('hide', scrollheight <= height + buttonheight)
        .on('click', function () {
          inner.node().scrollTo({
            top: scrolltop - (height - buttonheight),
            left: 0,
            behavior: 'smooth',
          });
        });

      sel
        .select('button.scroll-down')
        .classed('hide', scrollheight <= height + buttonheight)
        .on('click', function () {
          inner.node().scrollTo({
            top: scrolltop + height - buttonheight,
            left: 0,
            behavior: 'smooth',
          });
        });
    });
  }

  // SET UP OPTIONS FOR sm DISPLAYS
  if (['xs', 'sm'].includes(mediaSize)) {
    d3.select('button.input-toolbox').on('touchend, click', function () {
      d3.select(this).toggleClass('highlight');
      d3.select('.media-input-group').node().focus();
    });
    d3.select('.media-input-group')
      .on('touchend', function () {
        this.focus();
      })
      .on('focus', function () {
        if (this.style.maxHeight) this.style.maxHeight = null;
        else
          this.style.maxHeight = `${Math.min(
            this.scrollHeight,
            screen.height * 0.75,
          )}px`;
      })
      .on('blur', function () {
        this.style.maxHeight = null;
        d3.select('button.input-toolbox').classed('highlight', false);
      });
  }
}