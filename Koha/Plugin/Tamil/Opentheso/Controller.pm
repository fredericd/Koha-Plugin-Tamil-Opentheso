package Koha::Plugin::Tamil::Opentheso::Controller;

use Modern::Perl;
use Mojo::Base 'Mojolicious::Controller';

use Koha::Plugin::Tamil::Opentheso;

sub ark_counts {
    my ($c) = @_;

    $c->openapi->valid_input or return;

    my $arks_param = $c->validation->param('arks') // q{};
    my @arks = grep { /\S/ } split /,/, $arks_param;

    my $plugin = Koha::Plugin::Tamil::Opentheso->new();
    my $counts = $plugin->ark_counts( \@arks );

    return $c->render(
        status  => 200,
        openapi => {
            counts => $counts,
        },
    );
}

1;
