// Rendu markdown de la page d'accueil du plugin (chargé via <script src>,
// compatible CSP : aucun JS inline)
$(document).ready(function() {
  var source = $('#opentheso-home-source').text();
  if (!source) return;
  $('#opentheso-home').html(marked.parse(source));
});
