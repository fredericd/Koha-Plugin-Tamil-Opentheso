# Plugin Tamil Opentheso

[Opentheso](https://opentheso.hypotheses.org) est une application qui permet
d’interroger, d'enrichir et/ou de corriger les termes consitutant des
thesaurus, de créer les termes et de les placer dans une hiérarchie de termes.
La recherche et l’utilisation des termes ne requiert aucune authentification
préalable. En revanche, un _login_ est impératif pour modifier ou créer des
termes.

L'application Opentheso peut être utilisée via une interface web, ou bien exploitée
directement depuis une autre application de base de données au moyen de
services web. C'est au moyen des services web d'Opentheso que le plugin Tamil
Opentheso fonctionne.

Opentheso a été créé à la demande de la Fédération et ressources sur
l’Antiquité (GDS Frantiq), pour la gestion du thesaurus
[Pactols](https://pactols.frantiq.fr). C'est aujourd'hui un outil générique
proposé dans la grille de services de la TGIR
[Huma-Num](https://www.huma-num.fr). Le plugin Koha Tamil Opentheso a été
développé à la demande de Frantiq et mis à disposition de la communauté des
utilisateurs de Koha.

Le plugin **Tamil Opentheso** permet d'exploiter Opentheso depuis Koha et de
réaliser deux grandes catégories de tâches :

1. **Catalogage** — Dans les grilles de saisie de Koha, un onglet Opentheso est
   ajouté. Il contient la liste des termes d'Opentheso contenu dans la notice
   MARC. Une barre de recherche permet d'interroger directement des thesaurus
   et de lier des termes à la notice Koha. La forme principale du terme est
   placée dans une sous-zone MARC ($a) et l'identifiant ARK du terme dans une
   autre sous-zone (paramétrable). Les termes sont affichéxes avec des
   informations extraites des thesaurus : chemin complet du terme dans sa/ses
   hiérarchies ; traductions ; notes et variantes.

1. **Affichage** — Dans les affichages des notices, à l'OPAC et en PRO, les
   termes sont enrichis d'informations extraites des thesaurus.

## Installation

**Activation des plugins** — Si ce n'est pas déjà fait, dans Koha, activez les
plugins. Demandez à votre prestataire Koha de le faire, ou bien vérifiez les
points suivants :

- Dans `koha-conf.xml`, activez les plugins.
- Dans le fichier de configuration d'Apache, définissez l'alias `/plugins`.
  Faites en sorte que le répertoire pointé ait les droits nécessaires.
- Installez au besoin le module Perl `Text::Markdown`.

**📁 TÉLÉCHARGEMENT** — Récupérez sur le site [Tamil](https://www.tamil.fr)
l'archive de l'Extension **[Tamil
Opentheso](https://www.tamil.fr/download/koha-plugin-tamil-opentheso-1.0.1.kpz)**.

Dans l'interface pro de Koha, allez dans `Outils > Outils de Plugins`. Cliquez
sur Télécharger un plugin. Choisissez l'archive **téléchargée** à l'étape
précédente. Cliquez sur Télécharger.

## Configuration

Dans les Outils de plugin, vous voyez l'extension **Tamil Opentheso**. Vous
lancez le plugin puis vous cliquez sur Configurer. La page de configuration est
divisée en plusieurs sections. Notez qu'après l'installation du plugin, les
paramètres sont initialisés par défaut pour lier Koha au thesaurus
[Pactols](https://pactols.frantiq.fr). C'est une bonne base de travail. Vous
pouvez y revenir en vidant les zones de saisie.

- **API Opentheso** — Cette section contient les informations d'accès aux
  services web d'Opentheso.

  - **Point d'accès** — L'URL des services web d'un serveur Opentheso.
  - **Langue par défaut** — Un code de langue ISO, par exemple `fr` pour
    français ou `en` pour anglais. Si le thesaurus est multilingue, cela permet
    de choisir la langue des termes qui sont affichés et recopiés dans les
    notices MARC.
  - **Serveur ARK** — Le point d'entré du serveur ARK qui sera utilisé pour
    générer un lien direct depuis Koha vers le serveur Opentheso. Dans les
    notices bibliographiques, on trouve l'identifiant ARK d'un terme, par
    exemple `26678/pcrttcpeEPi2K0`. Le lien vers le terme sera : `<Serveur
    ARK><ARK>`. Par exemple :
    `https://ark.frantiq.fr/ark:/26678/pcrttcpeEPi2K0`.

- **Catalogage** — Cette section permet de paramétrer le fonctionnement du
  plugin sur la page de catalogage de Koha.

  - **Activer** — Pour activer l'utilisation du plugin sur la page de
    catalogage.
  - **Champs** — Contient la liste des thesaurus liés à des zones MARC. Il y a
    une ligne par thesaurus/zone. Par exemple : `Époque 698 TH_1 G124` lie la
    zone 698 au thesaurus Époque, dont le code Opentheso est `TH_1` et
    restreint à la collection `G124`. Chaque ligne contient les éléments
    suivants séparés par des espaces : 1) nom du thesaurus, 2) zone MARC, 3)
    code thesaurus, 4) optionnelement, une ou des collections séparés par des
    virgules. Voir plus bas pour le paramétrage de Koha.
  - **Sous-zone ARK** — La sous-zone qui contient les identifiants ARK des
    termes Opentheso. Par défaut `$4`. Certaines bibliothèques préféreront
    utiliser une autre sous-zone comme `$0` ou `$9`.
  - **Masquer** — Pour masquer les sous-zones de saisie _classiques_ de la page
    de catalogage.

![](screenshot-config.png)

**Paramétrage de Koha** — Pour utiliser le plugin Tamil Opentheso, il faut
commencer par ajouter des zones MARC spécifiques à ses grilles de catalogage.
Il faut modifier ses feuilles de styles XSL pour les afficher. Il faut également
modifier le paramétrage du moteur d'indexation.

Vous créez par exemple une zone **699** pour la lier à un thesaurus **Sujet**.
Votre zone 699 doit contenir deux sous-zones, une première pour contenir le
terme et une seconde pour contenir son identifiant ARK. Ce serait par exemple :

- `$a` : Sujet
- `$4` : ARK

Pour afficher cette nouvelle zone, vous modifier vos feuilles de style XSL, OPAC
et PRO. Par exemple pour l'OPAC, vous créez un template que vous appelez
ensuite depuis la feuille de style de la page de détail :

<script src="https://gist.github.com/fredericd/fb19ffe2ed650ffb5e36adbbcac07d79.js"></script>

## Catalogage

Dans le module de catalogage de Koha, un nouvel onglet Opentheso est affiché.
Il contient une section de recherche et une section d'affichage.

- Dans la section de recherche, vous pouvez sélectionner un thesaurus dans une
  boîte de liste. Dans une zone de saisie, vous entrez une expression de
  recherche. La recherche est lancée en pressant la touche Entrée. Le résultat
  est affiché. En survolant les termes, une info-bulle est affichée qui permet
  de replacer la terme dans sa hiérarchie, de voir ses traduction, et diverses
  informations complémentaires.

- Dans la section d'affichage, les termes Opentheso liés à la notice sont
  affichés. Ils sont regroupés par thesaurus. En survolant chaque terme, une
  info-bulle est affichée qui présente des informations complémenaires. Devant
  chaque terme, une icône permet de retirer le terme de la notice. Une autre
  icône permet d'ouvrir un onglet présentant le terme dans le serveur Opentheso
  relié.

## VERSIONS

* **1.0.1** / février 2023 — Version initiale

## LICENCE

This software is copyright (c) 2023 by Tamil s.a.r.l..

This is free software; you can redistribute it and/or modify it under the same
terms as the Perl 5 programming language system itself.

