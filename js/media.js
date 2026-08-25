(function (w) {
  "use strict";

  function splitSrc(src) {
    var q = "";
    var i = src.indexOf("?");
    if (i >= 0) {
      q = src.slice(i);
      src = src.slice(0, i);
    }
    return { path: src, query: q };
  }

  function swapExt(src, ext) {
    var parts = splitSrc(src);
    return parts.path.replace(/\.(png|jpe?g)$/i, "." + ext) + parts.query;
  }

  function mimeOf(src) {
    return /\.jpe?g(\?|$)/i.test(src) ? "image/jpeg" : "image/png";
  }

  w.mediaPicture = function (src, attrs, options) {
    options = options || {};
    attrs = attrs ? " " + attrs : "";
    var loading = options.eager
      ? ' loading="eager" fetchpriority="high" decoding="async"'
      : ' loading="lazy" decoding="async"';
    return (
      "<picture>" +
      '<source type="image/avif" srcset="' +
      swapExt(src, "avif") +
      '">' +
      '<source type="image/webp" srcset="' +
      swapExt(src, "webp") +
      '">' +
      '<img src="' +
      src +
      '"' +
      loading +
      attrs +
      ">" +
      "</picture>"
    );
  };

  w.mediaBg = function (src) {
    return (
      "image-set(url('" +
      swapExt(src, "avif") +
      "') type('image/avif'),url('" +
      swapExt(src, "webp") +
      "') type('image/webp'),url('" +
      src +
      "') type('" +
      mimeOf(src) +
      "'))"
    );
  };
})(window);
