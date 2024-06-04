provider "aws" {
  region = "us-east-1"  // Set this to your preferred AWS region
}

resource "aws_iam_user" "talking_toaster" {
  name = "TalkingToaster"
}

resource "aws_iam_access_key" "talking_toaster_key" {
  user = aws_iam_user.talking_toaster.name
}

resource "aws_iam_user_policy_attachment" "polly_full_access" {
  user       = aws_iam_user.talking_toaster.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonPollyFullAccess"
}

output "talking_toaster_access_key" {
  description = "The AWS access key ID for TalkingToaster"
  value       = aws_iam_access_key.talking_toaster_key.id
  sensitive   = true
}

output "talking_toaster_secret_key" {
  description = "The AWS secret access key for TalkingToaster"
  value       = aws_iam_access_key.talking_toaster_key.secret
  sensitive   = true
}
