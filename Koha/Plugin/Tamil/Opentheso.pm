package Koha::Plugin::Tamil::Opentheso;

use Modern::Perl;
use utf8;
use base qw(Koha::Plugins::Base);
use CGI qw(-utf8);
use C4::Biblio;
use Koha::Cache;
use Mojo::UserAgent;
use Mojo::JSON qw(decode_json encode_json);
use Pithub::Markdown;
use Template;


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

    my $c = $self->{args}->{c};
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
    $c->{ws} ||= {};
    $c->{ws}->{url} ||= 'https://pactols.frantiq.fr/opentheso/api';
    $c->{ws}->{lang} ||= 'fr';
    $c->{ws}->{ark} ||= 'https://ark.frantiq.fr/ark:/';
    $c->{catalog} ||= {};
    $c->{catalog}->{enabled} ||= 0;
    $c->{catalog}->{fields} ||= [];
    $c->{catalog}->{fields} = [
        {
            name => 'Sujet',
            tag => '699',
            theso => 'TH_1',
            group => 'G116,G126,G122,G173,G128,G137,G120,G135,G118,G130,G132',
        },
        {
            name => 'Époque',
            tag => '698',
            theso => 'TH_1',
            group => 'G124',
        },
        {
            name => 'Lieu',
            tag => '697',
            theso => 'th17',
        }
    ] if @{$c->{catalog}->{fields}} == 0;
    $c->{catalog}->{ark} ||= '4';
    $c->{catalog}->{mask} ||= 0;
    
    $c->{catalog}->{pertag} = {};
    for my $field (@{$c->{catalog}->{fields}}) {
        $c->{catalog}->{pertag}->{$field->{tag}} = $field;
    }

    $c->{metadata} = $self->{metadata};

    $self->{args}->{c} = $c;

    return $c;
}


sub get_form_config {
    my $cgi = shift;
    my $c = {
        ws => {
            url => undef,
            lang => undef,
            ark => undef,
        },
        catalog => {
            enabled => 0,
            fields => 0,
            ark => 0,
            mask => 0,
        },
    };

    my $set;
    $set = sub {
        my ($node, $path) = @_;
        return if ref($node) ne 'HASH';
        for my $subkey ( keys %$node ) {
            my $key = $path ? "$path.$subkey" : $subkey;
            my $subnode = $node->{$subkey};
            if ( ref($subnode) eq 'HASH' ) {
                $set->($subnode, $key);
            }
            else {
                $node->{$subkey} = $cgi->param($key);
            }
        }
    };

    $set->($c);
    return $c;
}


sub configure {
    my ($self, $args) = @_;
    my $cgi = $self->{'cgi'};

    if ( $cgi->param('save') ) {
        my $c = get_form_config($cgi);
        my @fields;
        for (split /\n/, $c->{catalog}->{fields}) {
            s/\r$//g;
            s/\n$//g;
            s/  / /g;
            my @values = split / /, $_;
            my $field = {};
            if (@values == 3 || @values == 4) {
                $field->{name} = $values[0];
                $field->{tag} = $values[1];
                $field->{theso} = $values[2];
                $field->{group} = $values[3] if @values == 4;
                push @fields, $field;
            }
        }
        $c->{catalog}->{fields} =  @fields ? \@fields : '';
        $self->store_data({ c => encode_json($c) });
        print $self->{'cgi'}->redirect(
            "/cgi-bin/koha/plugins/run.pl?class=Koha::Plugin::Tamil::Opentheso&method=tool");
    }
    else {
        my $template = $self->get_template({ file => 'configure.tt' });
        my $c = $self->config();
        $c->{catalog}->{fields} = join("\n", map {
            my $field = $_;
            my @values = (
                $field->{name},
                $field->{tag},
                $field->{theso},
            );
            push @values, $field->{group} if $field->{group}; 
            join(' ', @values);
        } @{$c->{catalog}->{fields}} );

        $template->param( c => $c );
        $self->output_html( $template->output() );
    }
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
                mode => "gfm",
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
    my $c = encode_json($self->config());
    utf8::decode($c);
    return <<EOS;
<script>
\$(document).ready(() => {
    \$.getScript("$js_file")
        .done(() => \$.tamilOpentheso($c));
    });
</script>
EOS

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
