  (function( jQuery, undefined ) {

  const ot = {};


function pageCatalog() {
  ot.selection = {};
  // On charge les éléments externes
  $('head').append('<link rel="stylesheet" type="text/css" href="/plugin/Koha/Plugin/Tamil/Opentheso/opentheso.css">');

  const c = ot.c;
  const {fields, pertag} = c;
  const tags = fields.map(field => field.tag);

  // Récupération des arks
  let arks = {};
  let regex = fields.map(field => `tag_${field.tag}_subfield_${field.ark}`).join('|');
  regex = new RegExp(regex);
  $('.input_marceditor').each(function(){
    const id = this.id;
    if ( ! id.match(regex) ) { return; }
    const tag = id.substr(4,3);
    const ark = $(this).attr("value");
    if (ark.indexOf('/') > -1) {
      arks[tag] ??= [];
      arks[tag].push(ark);
    }
  });

  // Affichage du widget de catalogage Opentheso
  $('.toolbar-tabs').append(`
    <li role="presentation">
      <a id="opentheso-tab" data-tabid="99" href="#tab99XX" aria-controls="#tab99XX" role="tab" data-toggle="tab">Opentheso</a>
    </li>`);
  $("#opentheso-tab").click((e) => {
    e.preventDefault();
    selectTab(this.hash);
  });
  const options = fields.map(f => `<option value="${f.tag}">${f.name}</option>`).join("\n");
  $('#addbibliotabs .tab-content').append(`
    <div id="tab99XX" role="tabpanel" class="tab-pane active">
      <div id="idxOpentheso">
        <div class="content">
          <div class="searchsection">
            <select name="selectedOpentheso" id="selectedOpentheso">
              ${options}
            </select>
            <input class="search" type="text" text="Indexation" placeholder="Rechercher un terme" size="100" />
            <span class="ToutesLanguesOpenthesoSpan">
              <input type="checkbox" name="ToutesLanguesOpentheso" id="ToutesLanguesOpentheso">Toutes les langues
            </span>
            <div class="result"></div>
          </div>
          <div class="separation">
            <h1>Termes d'Opentheso utilisés dans la notice</h1>
          </div>
          <div class="selection" ></div>
        </div>
      </div>
    </div>
  `);
  $("a[href='#tab1XX']").click();
  $("a[href='#tab0XX']").click();

  // Cacher les zones de saisies classiques
  if (c.catalog.mask) {
    let regex = tags.map(tag => `tag_${tag}_`).join('|');
    $('.tag').filter(function(){ return this.id.match(regex); }).hide();
  }

  Object.keys(arks).forEach( (tag) => {
    const selection = ot.selection[tag] = [];
    const field = pertag[tag];
    const value = arks[tag].join(',');
    const lang = field.lang || 'fr';
    const url = `${field.server}/api/searchwidgetbyark?q=${value}&lang=${lang}&theso=${field.theso}&format=full`;
    $.getJSON (url, function(data) {
      data.forEach((t) => {
        const last = t[t.length-1];
        const ark = last.arkId;
        let term = selection.find(t => t.ark === ark);
        if (term === undefined) {
          term = {
            ark,
            term: last.label,
            syno: last.altLabel,
            definition: last.definition,
            note: last.scopeNote,
            paths: []
          };
          if (last.labels) term.trads = last.labels;
          selection.push(term);
        }
        term.paths.push(t.map( tt => tt.label));
      });
      displaySelection();
    });
  });

  // On anime la recherche dans Opentheso
  let currPathPerTerm;
  $('#opentheso_open').click(function(){
    $("#idxOpentheso").jqxWindow({
      width: 900, height: 900, isModal: true
    }).show();
  });
  $('#idxOpentheso .search').keypress(function(e) {
    if (e.which == 27) {
      $('#idxOpentheso .result').html('');
      $(this).preventDefault();
    } else if (e.which === 13) {
      e.preventDefault();
      const value = $(this).val();
      if (value.length < 2) { return; }
      let tag = $('#selectedOpentheso').val();
      const field = pertag[tag];
      const lang = field.lang || 'fr';
      let selectedLang = $('#ToutesLanguesOpentheso').prop("checked") ? '' : `&lang=${lang}`;
      let url = `${field.server}/api/searchwidget?q=${value}${selectedLang}&theso=${field.theso}&format=full`;
      if (field.group) {
        url = url + `&group=${field.group}`;
      }
      const html = [];
      $('#idxOpentheso .search').addClass('searching');
      $('#idxOpentheso .result').html("");
      $.getJSON (url, function(paths) {
        const pathPerTerm = {};
        paths.forEach((path) => {
          const last = path[path.length-1];
          const ark = last.arkId;
          let term = pathPerTerm[ark];
          if (term === undefined) {
            term = pathPerTerm[ark] = {
              ark,
              term: last.label,
              syno: last.altLabel,
              definition: last.definition,
              note: last.scopeNote,
              paths: []
            };
            if (last.labels) term.trads = last.labels;
          }
          const p = [];
          for (let i=0; i < path.length; i++) {
            p.push(path[i].label);
          }
          term.paths.push(p);
        });
        $('#idxOpentheso .search').removeClass('searching');
        currPathPerTerm = pathPerTerm;
        Object.keys(pathPerTerm).forEach((ark) => {
          const term = pathPerTerm[ark];
          html.push(getHtmlTerm(term, tag, 'select'));
        });
        $('#idxOpentheso .result').html(html.join("\n"));
        $('[data-toggle="tooltip"]').tooltip({ html: 1 });
        $('.opentheso_select').click(function(){
          const ark = $(this).attr("ark");
          const tag = $(this).attr("tag");
          const term = currPathPerTerm[ark];
          const selection = ot.selection;
          selection[tag] ??= [];
          if (!selection[tag].find(t => t.ark === term.ark)) {
            selection[tag].push(term);
          }
          displaySelection();
        });
        seeEvent();
      }).fail(function(){
        $('#idxOpentheso .search').removeClass('searching');
      });
    }
  });

  // Alimentation des <input> avec les termes/id Opentheso quand le formulaire
  // est envoyé
  const classicCheck = Check; // Au secours ! une fonction Check() globale.
  Check = function() {
    // Suppression des zones classiques
    let regex = tags.map(tag => `tag_${tag}_`).join('|');
    $('.tag').filter(function(){ return this.id.match(regex); }).remove();

    const html = [];
    let iTag = 1;
    fields.forEach((field) => {
      const {tag, ark} = field;
      const selection = ot.selection[tag];
      if (selection === undefined) return;
      selection.forEach((term) => {
        html.push(`
          <input type="text" name="tag_${tag}_indicator1_${iTag}" value=" " />
          <input type="text" name="tag_${tag}_indicator2_${iTag}" value=" " />
          <input type="text" name="tag_${tag}_code_${ark}_${iTag}_1" value="${ark}" />
          <input type="text" name="tag_${tag}_subfield_${ark}_${iTag}_1" value="${term.ark}" />
          <input type="text" name="tag_${tag}_code_a_${iTag}_2" value="a" />
          <input type="text" name="tag_${tag}_subfield_a_${iTag}_2" value="${term.term}" />
        `);
        iTag++;
      });
    });
    $('form[name="f"]').append(html.join("\n"));
    classicCheck();
  };
}


function displaySelection() {
  // Màj de la zone des termes sélectionnés
  const c = ot.c;
  const fields = c.fields;
  const selection = ot.selection;
  const terms = [];
  let html = [];
  fields.forEach((field) => {
    const tag = field.tag;
    if (selection[tag] === undefined) return;
    html.push(`
      <div class="microtheso">
        <h1>${field.name}</h1>
    `);
    selection[tag].forEach((term) => {
      html.push(getHtmlTerm(term, tag, 'remove'));
    });
    html.push('</div>');
  });

  html = html.join("\n");
  $("#idxOpentheso .selection").html(html);
  $('[data-toggle="tooltip"]').tooltip({ html: 1 });
  $('.opentheso_remove').click(function(){
    const ark = $(this).attr("ark");
    const selection = ot.selection;
    Object.keys(selection).forEach((tag) => {
      selection[tag] = selection[tag].filter( term => term.ark !== ark );
      if (selection[tag].length == 0) delete selection[tag];
    });
   displaySelection();
  });
  seeEvent();
}


function getHtmlTerm(term, tag, action) {
  let html = [];
  let tooltip = [];
  tooltip.push('<p>');
  term.paths.forEach((path) => {
    let p = [...path];
    p[p.length-1] = "<b style='text-decoration: underline;'>" + p[p.length-1] + '</b>';
    tooltip.push(`<i class='fa fa-home' aria-hidden='true'></i> ${p.join(' > ')}`)
  });
  tooltip.push('</p>');
  if (term.trads) {
    tooltip.push(
      '<p><b>TRADUCTION</b> : ' +
      Object.keys(term.trads).sort().map(lang => `(${lang}): ${term.trads[lang]}`).join(' — ') +
      '</p>'
    );
  }
  if (term.syno) {
    tooltip.push(`<p><b>VARIANTE</b> : ${term.syno.join(' • ')}</p>`);
  }
  if (term.definition) {
    tooltip.push(`<p><b>DÉFINITION</b> : ${term.definition.join(' • ')}</p>`);
  }
  if (term.note) {
    tooltip.push(`<p><b>NOTE</b> : ${term.note.join(' • ').replace(/"/g, '\"')}</p>`);
  }
  tooltip = tooltip.join('').replaceAll('"', "''");
  let icon = action === 'select' ? 'fa-plus-circle' : 'fa-minus-circle';
  html.push(`
    <p>
      <span class="opentheso_${action}" ark="${term.ark}" tag="${tag}">
        <i class='fa ${icon}' title='OK'></i>
      </span>
      <span class="opentheso_term">
        <a class="ark" data-toggle="tooltip" data-placement="right" title="${tooltip}">${term.term}</a>
      </span>
      <span class="opentheso_see" tag="${tag}" ark="${term.ark}"></span>
    </p>
  `);
  return html.join("\n");
}


function seeEvent() {
  $('.opentheso_see').click(function(){
    const tag = $(this).attr("tag");
    const ark = $(this).attr("ark");
    const url = `${ot.c.pertag[tag].server}/api/ark:/${ark}`;
    window.open(url, '_blank');
  });
}


function pageOpacDetail() {
  $('head').append('<link rel="stylesheet" type="text/css" href="/plugin/Koha/Plugin/Tamil/Opentheso/opentheso.css">');
  const {c} = ot;
  const arkPerTag = {};
  // Récupération des arks
  $('.opentheso-tag-ark').each(function(){
    const elt = $(this);
    const ark = elt.attr('ark');
    const tag = elt.attr('tag');
    const arks = arkPerTag[tag] ||= [];
    arks.push(ark);
  });
  if (Object.keys(arkPerTag).length === 0) return;

  $('.nav-tabs').append(`
    <li id="tab_opentheso" class="nav-item" role="presentation">
     <a href="#opentheso" class="nav-link" id="tab_opentheso-tab" data-toggle="tab" role="tab" aria-controls="tab_opentheso" aria-selected="false">Opentheso</a>
    </li>
  `);
  $('.tab-content').append(`
    <div id="opentheso" class="tab-pane" role="tabpanel" aria-labelledby="tab_opentheso-tab">
      <button class="btn btn-primary" id="opentheso-query">Interroger</button>
    </div>
  `);

  let tabClicked = false;
  const arkCount = new Set();
  $('a[href=#opentheso]').click(function() {
    if (tabClicked) return;
    tabClicked = true;
    let firstField = true;
    $('#opentheso').html("<div>Chargement en cours...</div>");
    const searchBase = '/cgi-bin/koha/opac-search.pl?q=an:';
    const tags = Object.keys(arkPerTag);
    retrievedTagsCount = 0;
    tags.forEach((tag) => {
      const arks = arkPerTag[tag];
      const field = c.pertag[tag];
      const lang = field.lang || 'fr';
      const url = `${field.server}/api/searchwidgetbyark?q=${arks.join(',')}&lang=${lang}&theso=${field.theso}&format=full`;
      $.getJSON(url, function(terms) {
        retrievedTagsCount++;
        let html = [];
        html.push(`
          <div id="opentheso-${tag}" class="opentheso-field">
            <h1>${field.name}</h1>
        `);
        terms.forEach((paths) => {
          const allArks = paths.map(p => p.arkId);
          allArks.forEach(ark => arkCount.add(ark));
          const max = paths.length;
          const term = paths[paths.length-1];
          html.push(`
            <div class="opentheso-term">
              <h2>
                <a href="${searchBase}${term.arkId}" target="_blank">
                  ${term.label}
                </a>
                <span class="ark-count ark-${term.arkId.replace(/\//g, '-')}">0</span>
              </h2>
              <ul>
          `);
          if (term.altLabel) {
            html.push(`
              <li>
                <b>Synonymes: </b>
                ${term.altLabel.join(' ; ')}
              </li>
            `);
          }
          if (term.definition) {
            html.push(`
              <li>
                <b>Définition: </b>
                ${term.definition.join(' ')}
              </li>
            `);
          }
          if (term.labels) {
            const {labels} = term;
            html.push(`
              <li>
                <b>Traduction: </b>
                ${Object.keys(labels).sort().map(lang => lang + ': ' + labels[lang]).join(' ; ')}
              </li>
            `);
          }
          if (paths.length > 1) {
            html.push(`
              <li>
                <b>Hiérarchie:</b>
            `);
            for (let i=0; i < max; i++) {
              const t = paths[i];
              const arkQueryDown = allArks.slice(i, max).join(' OR ');
              const arkQueryTop = allArks.slice(0, i+1).join(' OR ');
              const linkDown = i !== max-1
                ? `
                  <a
                    href="${searchBase}${arkQueryDown}"
                    title="Tous les termes vers le bas"
                    target="_blank"
                  >
                    ⬇️
                  </a>`
                : '';
              const linkTop = i > 0
                ? `
                  <a
                    href="${searchBase}${arkQueryTop}"
                    title="Tous les termes vers le haut"
                    target="_blank"
                  >
                    ⬆️
                  </a>`
                : '';
              const linkTree = i > 0
                ? `
                  <span
                    ark="${t.arkId}"
                    tag="${tag}"
                    class="opentheso-tree-search"
                    title="Tous les termes de l'arbre"
                  >
                    ↘️
                  </span>`
                : '';
              html.push(`
                <div class="opentheso-hierarchie-${i}">
                  <a href="${searchBase}${t.arkId}" target="_blank">
                    ${t.label}
                  </a>
                  <span class="ark-count ark-${t.arkId.replace(/\//g, '-')}">0</span>
                  ${linkTop}
                  ${linkDown}
                  ${linkTree}
                </div>`);
            }
            html.push('</ul></li>');
          }
          html.push('</ul></div>');
        });
        html.push('</div>');
        html = html.join("\n");
        if (firstField) {
          $('#opentheso').html(html);
          firstField = false;
        } else {
          $('#opentheso').append(html);
        }
        if (retrievedTagsCount == tags.length) {
          const urlBase = '/es/koha_frantiq_biblios/_count?q=koha-auth-number:';
          let arks = Array.from(arkCount);
          let data = [];
          arks.forEach(ark => data.push(
            '{"size": 0,"query": {"query_string": { "query": "koha-auth-number:\\"' +
            ark + '\\"" } } }'
          ));
          data = data.join("\n\n");
          data = "{ }\n" + data + "\n"; // Chaque saut à ligne compte dans un multi-search ES...
          const url = '/es/koha_frantiq_biblios/_msearch';
          $.post({
            type: "POST",
            url,
            data,
            contentType: 'application/x-ndjson',
            success: function(res) {
              arks.forEach((ark, i) => {
                const count = res.responses[i].hits.total;
                const e = $(`.ark-${ark.replace(/\//g, '-')}`);
                e.html(count);
              });
            },
          });
          $('.opentheso-tree-search').click(function() {
            const e = $(this);
            const ark = e.attr('ark');
            const tag = e.attr('tag');
            const field = c.pertag[tag];
            const url = `${field.server}/api/ark/allchilds?ark=${ark}`;
            console.log(url);
            $.getJSON(url, function(res) {
              if (res.message) return;
              const url = `${searchBase}${res.arks.join(' OR ')}`;
              window.open(url, '_blank').focus();
            });
          });
        }
      });
    });
  });
}

function run(conf) {
  const c = ot.c = conf;
  const pertag = c.pertag = {};
  c.fields.forEach(field => pertag[field.tag] = field);

  if (c.catalog.enable && $('body').is("#cat_addbiblio")) {
    pageCatalog();
  }
  if ($('body').is('#opac-detail')) {
    pageOpacDetail();
  }
}


$.extend({
  tamilOpentheso: (c) => run(c),
});


})( jQuery );
