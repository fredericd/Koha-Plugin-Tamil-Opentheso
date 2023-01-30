(function( jQuery, undefined ) {

const ot = {};


function pageCatalog() {
  ot.selection = {};
  // On charge les éléments externes
  $('head').append('<link rel="stylesheet" type="text/css" href="/plugin/Koha/Plugin/Tamil/Opentheso/opentheso.css">');

  const c = ot.c;
  const lang = c.ws.lang;
  const tags = c.catalog.fields.map(field => field.tag);

  // Récupération des arks
  let arks = {};
  let regex = tags.map(tag => `tag_${tag}_subfield_${c.catalog.ark}`).join('|');
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
  const options = c.catalog.fields.map(f => `<option value="${f.tag}">${f.name}</option>`).join("\n");
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

  const pertag = c.catalog.pertag;
  Object.keys(arks).forEach( (tag) => {
    const selection = ot.selection[tag] = [];
    const iconf = pertag[tag];
    const value = arks[tag].join(',');
    const url = `${c.ws.url}/searchwidgetbyark?q=${value}&lang=${lang}&theso=${iconf.theso}&format=full`;
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
      console.log("Escape");
      $('#idxOpentheso .result').html('');
      $(this).preventDefault();
    } else if (e.which === 13) {
      e.preventDefault();
      const value = $(this).val();
      if (value.length < 2) { return; }
      let tag = $('#selectedOpentheso').val();
      let selectedLang = $('#ToutesLanguesOpentheso').prop("checked") ? '' : `&lang=${lang}`;
      const iconf = pertag[tag];
      let url = `${c.ws.url}/searchwidget?q=${value}${selectedLang}&theso=${iconf.theso}&format=full`;
      if (iconf.group) {
        url = url + `&group=${iconf.group}`;
      }
      console.log(`URL: ${url}`);
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
        console.log(pathPerTerm);
        currPathPerTerm = pathPerTerm;
        const lang = c.ws.lang;
        Object.keys(pathPerTerm).forEach((ark) => {
          const term = pathPerTerm[ark];
          html.push(getHtmlTerm(term, tag, 'select'));
        });
        $('#idxOpentheso .result').html(html.join("\n"));
        $('[data-toggle="tooltip"]').tooltip({ html: 1 });
        $('.opentheso_select').click(function(){
          const ark = $(this).attr("ark");
          const tag = $(this).attr("tag");
          //console.log(`click ${ark} - ${tag}`);
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
        //console.log("Erreur recherche");
      });
    }
  });

  // Alimentation des <input> avec les termes/id Opentheso
  const classicCheck = Check; // Au secours ! une fonction Check() globale.
  Check = function() {
    // Suppression des zones classiques
    let regex = tags.map(tag => `tag_${tag}_`).join('|');
    $('.tag').filter(function(){ return this.id.match(regex); }).remove();

    const html = [];
    let iTag = 1;
    tags.forEach((tag) => {
      const selection = ot.selection[tag];
      if (selection === undefined) return;
      selection.forEach((term) => {
        html.push(`
          <input type="text" name="tag_${tag}_indicator1_${iTag}" value=" " />
          <input type="text" name="tag_${tag}_indicator2_${iTag}" value=" " />
          <input type="text" name="tag_${tag}_code_${c.catalog.ark}_${iTag}_1" value="${c.catalog.ark}" />
          <input type="text" name="tag_${tag}_subfield_${c.catalog.ark}_${iTag}_1" value="${term.ark}" />
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
  const pertag = c.catalog.pertag;
  const selection = ot.selection;
  const terms = [];
  let html = [];
  const tags = c.catalog.fields.map(field => field.tag);
  tags.forEach((tag) => {
    if (selection[tag] === undefined) return;
    const iconf = pertag[tag];
    html.push(`
      <div class="microtheso">
        <h1>${iconf.name}</h1>
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
      <span class="opentheso_see" ark="${term.ark}"></span>
    </p>
  `);
  return html.join("\n");
}


function seeEvent() {
  $('.opentheso_see').click(function(){
    const ark = $(this).attr("ark");
    const url = `${ot.c.ws.ark}${ark}`;
    window.open(url, '_blank');
  });
}


function run(conf) {
  const c = ot.c = conf;
  if (c.catalog.enabled && $('body').is("#cat_addbiblio")) {
    pageCatalog();
  }
}


$.extend({
  tamilOpentheso: (c) => run(c),
});


})( jQuery );
