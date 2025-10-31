#!/usr/bin/env python3
"""
A/B Test Analysis Script
========================

Analyzes A/B test results from the Box Factory landing page.
Calculates statistical significance and provides recommendations.

Usage:
    python ab_test_analysis.py --input analytics_data.json
    
Requirements:
    pip install scipy pandas numpy
"""

import json
import argparse
from dataclasses import dataclass
from typing import List, Dict, Optional
import math

try:
    from scipy import stats
    import pandas as pd
    import numpy as np
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False
    print("Warning: scipy not available. Statistical tests will be limited.")
    print("Install with: pip install scipy pandas numpy")


@dataclass
class VariantResults:
    """Results for a single variant"""
    variant_id: str
    variant_name: str
    total_users: int
    conversions: int
    conversion_rate: float
    avg_session_duration: float
    avg_interactions: float
    
    def __post_init__(self):
        if self.total_users > 0:
            self.conversion_rate = (self.conversions / self.total_users) * 100
        else:
            self.conversion_rate = 0.0


class ABTestAnalyzer:
    """Analyzes A/B test results and provides statistical insights"""
    
    def __init__(self, data: List[Dict]):
        self.data = data
        self.experiments = {}
        self._process_data()
    
    def _process_data(self):
        """Process raw analytics data into experiment results"""
        # Group events by experiment and variant
        for event in self.data:
            if event.get('name') == 'ab_test_assigned':
                exp_id = event.get('experimentId')
                var_id = event.get('variantId')
                
                if exp_id not in self.experiments:
                    self.experiments[exp_id] = {}
                
                if var_id not in self.experiments[exp_id]:
                    self.experiments[exp_id][var_id] = {
                        'name': event.get('variantName', var_id),
                        'users': set(),
                        'conversions': 0,
                        'session_durations': [],
                        'interactions': [],
                    }
                
                self.experiments[exp_id][var_id]['users'].add(event.get('sessionId'))
            
            elif event.get('name') == 'ab_test_conversion':
                exp_id = event.get('experimentId')
                var_id = event.get('variantId')
                
                if exp_id in self.experiments and var_id in self.experiments[exp_id]:
                    self.experiments[exp_id][var_id]['conversions'] += 1
            
            elif event.get('name') == 'session_end':
                # Track session metrics per variant (would need to join with assignment)
                pass
    
    def get_variant_results(self, experiment_id: str) -> Dict[str, VariantResults]:
        """Get results for all variants in an experiment"""
        if experiment_id not in self.experiments:
            return {}
        
        results = {}
        for var_id, data in self.experiments[experiment_id].items():
            results[var_id] = VariantResults(
                variant_id=var_id,
                variant_name=data['name'],
                total_users=len(data['users']),
                conversions=data['conversions'],
                conversion_rate=0,  # Calculated in __post_init__
                avg_session_duration=np.mean(data['session_durations']) if data['session_durations'] else 0,
                avg_interactions=np.mean(data['interactions']) if data['interactions'] else 0,
            )
        
        return results
    
    def calculate_significance(self, variant_a: VariantResults, variant_b: VariantResults) -> Dict:
        """Calculate statistical significance between two variants"""
        if not SCIPY_AVAILABLE:
            return {
                'error': 'scipy not available',
                'significant': False,
            }
        
        # Chi-square test for conversion rates
        observed = np.array([
            [variant_a.conversions, variant_a.total_users - variant_a.conversions],
            [variant_b.conversions, variant_b.total_users - variant_b.conversions]
        ])
        
        chi2, p_value, dof, expected = stats.chi2_contingency(observed)
        
        # Calculate confidence interval for difference
        rate_diff = variant_b.conversion_rate - variant_a.conversion_rate
        
        # Effect size (relative lift)
        relative_lift = ((variant_b.conversion_rate - variant_a.conversion_rate) / 
                        variant_a.conversion_rate * 100) if variant_a.conversion_rate > 0 else 0
        
        return {
            'p_value': p_value,
            'significant': p_value < 0.05,
            'confidence_level': (1 - p_value) * 100,
            'rate_difference': rate_diff,
            'relative_lift': relative_lift,
            'chi_square': chi2,
            'sample_size_adequate': self._check_sample_size(variant_a, variant_b),
        }
    
    def _check_sample_size(self, variant_a: VariantResults, variant_b: VariantResults) -> bool:
        """Check if sample size is adequate for meaningful results"""
        # Rule of thumb: Need at least 100 users and 5 conversions per variant
        min_users = 100
        min_conversions = 5
        
        return (variant_a.total_users >= min_users and 
                variant_b.total_users >= min_users and
                variant_a.conversions >= min_conversions and 
                variant_b.conversions >= min_conversions)
    
    def calculate_sample_size_needed(self, 
                                    baseline_rate: float,
                                    minimum_detectable_effect: float,
                                    alpha: float = 0.05,
                                    power: float = 0.8) -> int:
        """Calculate required sample size for A/B test"""
        if not SCIPY_AVAILABLE:
            return 0
        
        # Convert rates to proportions
        p1 = baseline_rate / 100
        p2 = p1 * (1 + minimum_detectable_effect / 100)
        
        # Calculate effect size (Cohen's h)
        effect_size = 2 * (math.asin(math.sqrt(p2)) - math.asin(math.sqrt(p1)))
        
        # Calculate sample size using power analysis
        z_alpha = stats.norm.ppf(1 - alpha/2)
        z_beta = stats.norm.ppf(power)
        
        n = ((z_alpha + z_beta) ** 2) / (effect_size ** 2)
        
        return int(math.ceil(n))
    
    def generate_report(self, experiment_id: str) -> str:
        """Generate a human-readable report for an experiment"""
        results = self.get_variant_results(experiment_id)
        
        if len(results) < 2:
            return f"Insufficient data for experiment: {experiment_id}"
        
        # Get control and variants
        variants = list(results.values())
        control = variants[0]  # Assume first variant is control
        
        report = []
        report.append("=" * 80)
        report.append(f"A/B TEST REPORT: {experiment_id}")
        report.append("=" * 80)
        report.append("")
        
        # Overall summary
        report.append("VARIANT PERFORMANCE")
        report.append("-" * 80)
        for variant in variants:
            report.append(f"\n{variant.variant_name} ({variant.variant_id}):")
            report.append(f"  Total Users:       {variant.total_users:,}")
            report.append(f"  Conversions:       {variant.conversions:,}")
            report.append(f"  Conversion Rate:   {variant.conversion_rate:.2f}%")
            report.append(f"  Avg Session:       {variant.avg_session_duration:.1f}s")
            report.append(f"  Avg Interactions:  {variant.avg_interactions:.1f}")
        
        # Statistical comparison
        report.append("\n" + "=" * 80)
        report.append("STATISTICAL ANALYSIS")
        report.append("=" * 80)
        
        for i, variant in enumerate(variants[1:], 1):
            report.append(f"\n{variant.variant_name} vs {control.variant_name}:")
            report.append("-" * 80)
            
            sig = self.calculate_significance(control, variant)
            
            if 'error' in sig:
                report.append(f"  Error: {sig['error']}")
                continue
            
            report.append(f"  Conversion Rate Difference: {sig['rate_difference']:+.2f}%")
            report.append(f"  Relative Lift:              {sig['relative_lift']:+.2f}%")
            report.append(f"  P-value:                    {sig['p_value']:.4f}")
            report.append(f"  Confidence Level:           {sig['confidence_level']:.2f}%")
            report.append(f"  Statistically Significant:  {'✓ YES' if sig['significant'] else '✗ NO'}")
            report.append(f"  Sample Size Adequate:       {'✓ YES' if sig['sample_size_adequate'] else '✗ NO'}")
            
            # Recommendation
            report.append("\n  Recommendation:")
            if not sig['sample_size_adequate']:
                needed = self.calculate_sample_size_needed(
                    control.conversion_rate, 
                    10  # 10% minimum detectable effect
                )
                report.append(f"    Continue test - need ~{needed:,} users per variant")
            elif sig['significant'] and sig['relative_lift'] > 0:
                report.append(f"    ✓ IMPLEMENT {variant.variant_name} - Shows significant improvement")
            elif sig['significant'] and sig['relative_lift'] < 0:
                report.append(f"    ✗ REJECT {variant.variant_name} - Shows significant decline")
            else:
                report.append(f"    = NO CLEAR WINNER - Consider running longer or testing other variables")
        
        report.append("\n" + "=" * 80)
        return "\n".join(report)


def load_analytics_data(filepath: str) -> List[Dict]:
    """Load analytics data from JSON file"""
    with open(filepath, 'r') as f:
        data = json.load(f)
    
    # Handle different data formats
    if isinstance(data, dict) and 'events' in data:
        return data['events']
    elif isinstance(data, list):
        return data
    else:
        raise ValueError("Unexpected data format")


def main():
    parser = argparse.ArgumentParser(description='Analyze A/B test results')
    parser.add_argument('--input', '-i', required=True, help='Input JSON file with analytics data')
    parser.add_argument('--experiment', '-e', help='Specific experiment ID to analyze')
    parser.add_argument('--output', '-o', help='Output file for report (optional)')
    parser.add_argument('--format', '-f', choices=['text', 'json'], default='text', 
                       help='Output format')
    
    args = parser.parse_args()
    
    # Load data
    print(f"Loading data from {args.input}...")
    data = load_analytics_data(args.input)
    print(f"Loaded {len(data)} events")
    
    # Analyze
    analyzer = ABTestAnalyzer(data)
    
    # Generate reports
    if args.experiment:
        experiments = [args.experiment]
    else:
        experiments = list(analyzer.experiments.keys())
    
    reports = []
    for exp_id in experiments:
        print(f"\nAnalyzing experiment: {exp_id}")
        report = analyzer.generate_report(exp_id)
        reports.append(report)
        
        if args.format == 'text':
            print(report)
    
    # Save output
    if args.output:
        with open(args.output, 'w') as f:
            if args.format == 'text':
                f.write('\n\n'.join(reports))
            else:  # json
                json.dump({
                    'experiments': {
                        exp_id: analyzer.get_variant_results(exp_id)
                        for exp_id in experiments
                    }
                }, f, indent=2, default=lambda o: o.__dict__)
        print(f"\nReport saved to {args.output}")


if __name__ == '__main__':
    main()


# ============================================================================
# EXAMPLE USAGE
# ============================================================================

"""
# Basic usage:
python ab_test_analysis.py --input analytics_data.json

# Analyze specific experiment:
python ab_test_analysis.py --input analytics_data.json --experiment landing_style

# Save report to file:
python ab_test_analysis.py --input analytics_data.json --output report.txt

# Export as JSON:
python ab_test_analysis.py --input analytics_data.json --format json --output results.json

# Using in Python:
from ab_test_analysis import ABTestAnalyzer

data = load_analytics_data('analytics_data.json')
analyzer = ABTestAnalyzer(data)
report = analyzer.generate_report('landing_style')
print(report)

# Calculate sample size needed:
needed = analyzer.calculate_sample_size_needed(
    baseline_rate=5.0,        # 5% baseline conversion
    minimum_detectable_effect=20,  # Want to detect 20% lift
    alpha=0.05,               # 95% confidence
    power=0.8                 # 80% power
)
print(f"Need {needed} users per variant")
"""