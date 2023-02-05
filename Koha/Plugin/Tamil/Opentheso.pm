package Koha::Plugin::Tamil::Opentheso;

use Modern::Perl;
use utf8;
use base qw(Koha::Plugins::Base);
use CGI qw(-utf8);
use C4::Biblio;
use Koha::Cache;
use Mojo::UserAgent;
use Mojo::JSON qw(decode_json encode_json);
use JSON qw/ to_json /;
use Pithub::Markdown;
use Template;
use YAML;


our $metadata = {
    name            => 'Tamil Opentheso',
    description     => 'Intégration de Opentheso à Koha',
    author          => 'Tamil s.a.r.l.',
    date_authored   => '2023-01-27',
    date_updated    => "2023-01-27",
    minimum_version => '22.11.00.000',
    maximum_version => undef,
    copyright       => '2023',
    version         => '1.0.1',
};


sub new {
    my ($class, $args) = @_;

    $args->{metadata} = $metadata;
    $args->{metadata}->{class} = $class;
    $args->{cache} = Koha::Cache->new();
    $args->{logger} = Koha::Logger->get({ interface => 'api' });

    $class->SUPER::new($args);
}


sub config {
    my $self = shift;

    my $c = $self->{c};
    my $logger = $self->{logger};
    unless ($c) {
        $c = $self->retrieve_data('c');
        if ($c) {
            utf8::encode($c);
            $c = decode_json($c);
        }
        else {
            $c = {};
        }
    }

    $c->{metadata} = $self->{metadata};

    $self->{args}->{c} = $c;

    return $c;
}


sub configure {
    my ($self, $args) = @_;
    my $cgi = $self->{'cgi'};

    my $template = $self->get_template({ file => 'configure.tt' });
    my $c;
    if ( $cgi->param('save') ) {
        $c = $cgi->param('c');
        $self->store_data({ c => $c });
    }
    else {
        $c = $self->retrieve_data('c');
        unless ($c) {
            $c =  $self->mbf_read("frantiq-conf.json");
            utf8::decode($c);
        }
    }
    $template->param( c => $c );
    $self->output_html( $template->output() );
}


sub tool {
    my ($self, $args) = @_;

    my $cgi = $self->{cgi};

    my $template;
    my $c = $self->config();
    my $ws = $cgi->param('ws');
    if ( $ws ) {
        # Emplacement pour d'autres pages...
    }
    else {
        $template = $self->get_template({ file => 'home.tt' });
        my $text = $self->mbf_read("home.md");
        utf8::decode($text);
        my $response = Pithub::Markdown->new->render(
            data => {
                text => $text,
                context => "github/gollum",
            },
        );
        my $markdown = $response->raw_content;
        utf8::decode($markdown);
        $template->param( markdown => $markdown );
    }
    $template->param( c => $self->config() );
    $template->param( WS => $ws ) if $ws;
    $self->output_html( $template->output() );
}


sub intranet_js {
    my $self = shift;
    my $js_file = $self->get_plugin_http_path() . "/opentheso.js";
    my $c = $self->config();
    $c = to_json($c);
    return <<EOS;
<script>
\$(document).ready(() => {
    \$.getScript("$js_file")
        .done(() => \$.tamilOpentheso($c));
    });
</script>
EOS

}


sub opac_js {
    shift->intranet_js();
}


sub install() {
    my ($self, $args) = @_;
}


sub upgrade {
    my ($self, $args) = @_;

    my $dt = DateTime->now();
    $self->store_data( { last_upgraded => $dt->ymd('-') . ' ' . $dt->hms(':') } );

    return 1;
}


sub uninstall() {
    my ($self, $args) = @_;
}

1;
