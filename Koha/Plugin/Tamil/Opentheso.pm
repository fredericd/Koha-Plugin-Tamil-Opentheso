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
use Template;
use YAML;


our $metadata = {
    name            => 'Tamil Opentheso',
    description     => 'Intégration de Opentheso à Koha',
    author          => 'Tamil s.a.r.l.',
    date_authored   => '2023-01-27',
    date_updated    => "2026-11-27",
    minimum_version => '23.11.00.000',
    maximum_version => undef,
    copyright       => '2023',
    version         => '1.1.0',
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
        # Le markdown est rendu en JS dans le navigateur (marked.min.js)
        $template->param( markdown => $text );
    }
    $template->param( c => $self->config() );
    $template->param( WS => $ws ) if $ws;
    $self->output_html( $template->output() );
}


sub intranet_js {
    my $self = shift;
    my $js_file = '/api/v1/contrib/opentheso/static/opentheso.js';
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


sub api_namespace {
    my $self = shift;
    return 'opentheso';
}


sub static_routes {
    my ( $self, $args ) = @_;

    my @filenames = qw(
        opentheso.js
        opentheso.css
        marked.min.js
        img/ot-logo.png
        img/logo-opentheso-titre.svg
        img/cata-opentheso.png
        img/tamil-logo-small.png
    );

    my $spec = {};
    foreach my $filename (@filenames) {
        $spec->{"/$filename"} = {
            get => {
                'x-mojo-to' => 'Static#get',
                tags        => ['pluginStatic'],
                responses   => {
                    200 => {
                        description => 'File found',
                        schema      => {
                            type => 'file',
                        },
                    },
                    404 => {
                        description => 'File not found',
                        schema      => {
                            type => 'object',
                            properties => {
                                error => {
                                    type => 'string',
                                },
                            },
                        },
                    },
                },
                parameters => [
                    # This parameter is appended by jQuery to disable browser cache
                    {
                        name => '_',
                        in   => 'query',
                        type => 'string',
                    },
                ],
            },
        };
    }

    return $spec;
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
